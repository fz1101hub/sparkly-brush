/**
 * `expo-file-system` (SDK 57 "next" API: File / Directory / Paths) over node:fs, confined to the
 * per-test app container created by the harness.
 *
 * - Paths.join/dirname/basename/extname port the real JS layer (src/pathUtilities): the first
 *   segment is parsed with WHATWG URL when possible, extra segments are URL-encoded.
 * - String → native location conversion mirrors the native side:
 *     iOS (ExpoModulesCore URL convertible): "file://..." → decoded path; scheme-less "/abs/path"
 *       → URL(fileURLWithPath:), i.e. plain paths WORK.
 *     Android (Uri.parse + java.io.File(URI)): scheme-less paths construct fine but every
 *       filesystem access (exists, uri, delete, copy, open...) throws
 *       "IllegalArgumentException: URI is not absolute". `size` swallows it and returns null.
 * - Permissions: inside the current app container → read/write; bundle → read-only; elsewhere in
 *   the test sandbox → none (iOS: exists=false, ops throw); outside the sandbox → HarnessError.
 */
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import nodePath from "node:path";
import { pathToFileURL } from "node:url";

import {
  appLayout,
  assertAlive,
  assertInsideTestRoot,
  checkpointAsync,
  checkpointSync,
  expoNativeError,
  harnessState,
  hop,
  isInside,
  type CallInfo,
} from "../core/state";

const MODULE_JS_EPOCH = harnessState().jsEpoch;
const posix = nodePath.posix;
const LOCATION = Symbol.for("sparkly-native-sqlite.fs.location");

type Kind = "file" | "directory";

interface Location {
  input: string;
  kind: Kind;
  hostPath: string | null;
  failure: string | null;
}

export enum FileMode {
  ReadOnly = "r",
  ReadWrite = "rw",
  WriteOnly = "w",
  Append = "wa",
  Truncate = "wt",
}

export enum EncodingType {
  UTF8 = "utf8",
  Base64 = "base64",
}

export const DEFAULT_DEBOUNCE_MS = 100;

// ---------------------------------------------------------------------------
// Path utilities (port of expo-file-system/src/pathUtilities)
// ---------------------------------------------------------------------------

function resolveNoCwd(value: string): string {
  const absolute = value.startsWith("/");
  const normalized = posix.normalize(value || ".");
  if (absolute) return normalized.replace(/\/+$/, "") || "/";
  const trimmed = normalized.replace(/\/+$/, "");
  return trimmed.length > 0 ? trimmed : ".";
}

function encodeURLChars(value: string): string {
  let resolved = resolveNoCwd(value);
  if (value.endsWith("/") && !resolved.endsWith("/")) resolved += "/";
  resolved = resolved
    .replace(/%/g, "%25")
    .replace(/\\/g, "%5C")
    .replace(/\n/g, "%0A")
    .replace(/\r/g, "%0D")
    .replace(/\t/g, "%09")
    .replace(/ /g, "%20")
    .replace(/\?/g, "%3F")
    .replace(/#/g, "%23");
  return resolved;
}

function asUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

function uriOf(value: string | File | Directory): string {
  return typeof value === "string" ? value : value.uri;
}

export class PathUtilities {
  static join(...paths: (string | File | Directory)[]): string {
    const [first = "", ...rest] = paths.map(uriOf);
    const url = asUrl(first);
    if (url) {
      url.pathname = posix.join(url.pathname, ...rest.map(encodeURLChars));
      return url.toString();
    }
    return posix.join(first, ...rest.map(encodeURLChars));
  }

  static relative(from: string | File | Directory, to: string | File | Directory): string {
    return posix.relative(uriOf(from), uriOf(to));
  }

  static isAbsolute(value: string | File | Directory): boolean {
    const text = uriOf(value);
    return asUrl(text) !== null || posix.isAbsolute(text);
  }

  static normalize(value: string | File | Directory): string {
    const text = uriOf(value);
    const url = asUrl(encodeURLChars(text));
    if (url) {
      url.pathname = encodeURLChars(posix.normalize(decodeURIComponent(url.pathname)));
      return url.toString();
    }
    return posix.normalize(text);
  }

  static dirname(value: string | File | Directory): string {
    const text = uriOf(value);
    const url = asUrl(text);
    if (url) {
      url.pathname = encodeURLChars(posix.dirname(decodeURIComponent(url.pathname)));
      return url.toString();
    }
    return posix.dirname(text);
  }

  static basename(value: string | File | Directory, ext?: string): string {
    const text = uriOf(value);
    const url = asUrl(text);
    if (url) return posix.basename(decodeURIComponent(url.pathname));
    return posix.basename(text, ext);
  }

  static extname(value: string | File | Directory): string {
    const text = uriOf(value);
    const url = asUrl(text);
    if (url) return posix.extname(decodeURIComponent(url.pathname));
    return posix.extname(text);
  }

  static parse(value: string | File | Directory) {
    const text = uriOf(value);
    const url = asUrl(text);
    return posix.parse(url ? decodeURIComponent(url.pathname) : text);
  }
}

// ---------------------------------------------------------------------------
// Native-side location handling
// ---------------------------------------------------------------------------

function parseLocation(input: string, kind: Kind): Location {
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(input)?.[1]?.toLowerCase();
  if (scheme === "file") {
    const url = new URL(input);
    const decoded = posix.normalize(decodeURIComponent(url.pathname));
    return { input, kind, hostPath: decoded.length > 1 ? decoded.replace(/\/+$/, "") : decoded, failure: null };
  }
  if (scheme) {
    return { input, kind, hostPath: null, failure: `unsupported URI scheme "${scheme}:" (${input})` };
  }
  if (harnessState().platform === "android") {
    // Uri.parse("/abs/path") has no scheme; JavaFile → java.io.File(URI.create(...)) throws.
    return { input, kind, hostPath: null, failure: "java.lang.IllegalArgumentException: URI is not absolute" };
  }
  // iOS: URL(fileURLWithPath:) — relative paths resolve against the process cwd ("/").
  return { input, kind, hostPath: posix.resolve("/", input), failure: null };
}

type Permission = "read" | "write";

function permissions(hostPath: string): Set<Permission> {
  assertInsideTestRoot(hostPath);
  const layout = appLayout();
  if (isInside(layout.bundleDir, hostPath)) return new Set(["read"]);
  if (isInside(layout.appRoot, hostPath)) return new Set(["read", "write"]);
  return new Set();
}

function locationOf(target: File | Directory): Location {
  return (target as unknown as Record<symbol, Location>)[LOCATION];
}

function fsError(fn: string, reason: string, code = "ERR_FILE_SYSTEM"): Error {
  return expoNativeError("FileSystem", fn, reason, code);
}

/** Host path of a location, throwing the platform-specific error for unusable URIs. */
function hostPathOf(location: Location, fn: string): string {
  if (location.failure || location.hostPath === null) {
    throw fsError(fn, location.failure ?? "invalid location");
  }
  return location.hostPath;
}

function requirePermission(location: Location, permission: Permission, fn: string): string {
  const hostPath = hostPathOf(location, fn);
  if (!permissions(hostPath).has(permission)) {
    throw fsError(fn, `Missing '${permission.toUpperCase()}' permission for accessing the file: ${location.input}`,
      "ERR_MISSING_PERMISSION");
  }
  return hostPath;
}

function statOrNull(hostPath: string): fs.Stats | null {
  try {
    return fs.statSync(hostPath);
  } catch {
    return null;
  }
}

function uriFor(location: Location, fn: string): string {
  const platform = harnessState().platform;
  if (platform === "android") {
    if (location.failure) throw fsError(fn, location.failure);
    const raw = location.input;
    if (location.kind === "directory") return raw.endsWith("/") ? raw : `${raw}/`;
    return raw.endsWith("/") ? raw.slice(0, -1) : raw;
  }
  const hostPath = hostPathOf(location, fn);
  const href = pathToFileURL(hostPath).href;
  if (location.kind === "directory") return href.endsWith("/") ? href : `${href}/`;
  return href;
}

function call(api: string, target: string): CallInfo {
  return { api, target };
}

function alive(what: string): void {
  assertAlive(MODULE_JS_EPOCH, `FileSystem.${what}`);
}

const MIME_TYPES: Record<string, string> = {
  ".sqlite": "application/vnd.sqlite3",
  ".db": "application/vnd.sqlite3",
  ".json": "application/json",
  ".txt": "text/plain",
  ".png": "image/png",
};

// ---------------------------------------------------------------------------
// FileHandle
// ---------------------------------------------------------------------------

export class FileHandle {
  private fd: number | null;
  private position: number;

  constructor(hostPath: string, private readonly mode: FileMode) {
    const flags = mode === FileMode.ReadOnly ? "r" : "r+";
    this.fd = fs.openSync(hostPath, flags);
    this.position = 0;
    if (mode === FileMode.Append) this.position = fs.fstatSync(this.fd).size;
    if (mode === FileMode.Truncate) fs.ftruncateSync(this.fd, 0);
    const state = harnessState();
    const registration = { close: () => this.closeQuietly() };
    state.openHandles.add(registration);
    this.unregister = () => state.openHandles.delete(registration);
  }

  private unregister: () => void;

  private closeQuietly(): void {
    if (this.fd !== null) {
      fs.closeSync(this.fd);
      this.fd = null;
    }
  }

  readBytes(length: number): Uint8Array<ArrayBuffer> {
    alive("FileHandle.readBytes");
    checkpointSync(call("fs.handle.read", String(length)));
    if (this.fd === null) throw fsError("readBytes", "Unable to read from a file handle: handle is closed");
    if (this.mode === FileMode.WriteOnly || this.mode === FileMode.Append || this.mode === FileMode.Truncate) {
      throw fsError("readBytes", "Unable to read from a file handle: File opened write-only");
    }
    const buffer = Buffer.alloc(Math.max(0, Math.floor(length)));
    const read = fs.readSync(this.fd, buffer, 0, buffer.length, this.position);
    this.position += read;
    return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + read)) as Uint8Array<ArrayBuffer>;
  }

  writeBytes(bytes: Uint8Array): void {
    alive("FileHandle.writeBytes");
    checkpointSync(call("fs.handle.write", String(bytes.byteLength)));
    if (this.fd === null) throw fsError("writeBytes", "Unable to write to a file handle: handle is closed");
    if (this.mode === FileMode.ReadOnly) throw fsError("writeBytes", "Unable to write to a file handle: File opened read-only");
    const written = fs.writeSync(this.fd, bytes, 0, bytes.byteLength, this.position);
    this.position += written;
  }

  close(): void {
    alive("FileHandle.close");
    checkpointSync(call("fs.handle.close", ""));
    if (this.fd === null) throw fsError("close", "File handle is already closed");
    this.closeQuietly();
    this.unregister();
  }

  get offset(): number | null {
    return this.fd === null ? null : this.position;
  }

  set offset(value: number | null) {
    if (this.fd !== null && typeof value === "number") this.position = value;
  }

  get size(): number | null {
    return this.fd === null ? null : fs.fstatSync(this.fd).size;
  }
}

// ---------------------------------------------------------------------------
// File
// ---------------------------------------------------------------------------

export interface RelocationOptions {
  overwrite?: boolean;
}

function relocationTarget(source: Location, destination: File | Directory, fn: string): string {
  const destinationLocation = locationOf(destination);
  const destinationPath = requirePermission(destinationLocation, "write", fn);
  if (destinationLocation.kind === "directory") {
    if (source.kind === "file" && !statOrNull(destinationPath)?.isDirectory()) {
      throw fsError(fn, `Destination directory does not exist: ${destinationLocation.input}`, "ERR_DESTINATION_DOES_NOT_EXIST");
    }
    const base = posix.basename(hostPathOf(source, fn));
    if (source.kind === "directory" && !statOrNull(destinationPath)?.isDirectory()) return destinationPath;
    return posix.join(destinationPath, base);
  }
  if (source.kind === "directory") throw fsError(fn, "Unable to copy or move a directory to a file");
  return destinationPath;
}

function relocate(source: Location, destination: File | Directory, options: RelocationOptions | undefined, move: boolean, fn: string): string {
  const sourcePath = requirePermission(source, move ? "write" : "read", fn);
  const target = relocationTarget(source, destination, fn);
  const sourceStat = statOrNull(sourcePath);
  if (!sourceStat) throw fsError(fn, `Unable to ${move ? "move" : "copy"}: source ${source.input} does not exist`);
  if (!statOrNull(posix.dirname(target))?.isDirectory()) {
    throw fsError(fn, `Destination parent directory does not exist: ${target}`, "ERR_DESTINATION_DOES_NOT_EXIST");
  }
  if (statOrNull(target)) {
    if (!options?.overwrite) {
      throw fsError(fn, `Destination already exists: ${target}`, "ERR_DESTINATION_ALREADY_EXISTS");
    }
    fs.rmSync(target, { recursive: true, force: true });
  }
  if (move) fs.renameSync(sourcePath, target);
  else fs.cpSync(sourcePath, target, { recursive: true, errorOnExist: true, force: false });
  return target;
}

export class File {
  declare [LOCATION]: Location;

  constructor(...uris: (string | File | Directory)[]) {
    alive("File constructor");
    Object.defineProperty(this, LOCATION, {
      value: parseLocation(Paths.join(...uris), "file"),
      writable: true,
      enumerable: false,
    });
    this.validatePath();
  }

  validatePath(): void {
    const location = this[LOCATION];
    if (harnessState().platform === "ios" && location.failure) {
      throw fsError("validatePath", "tried to create a file with a directory path");
    }
  }

  get uri(): string {
    alive("File.uri");
    return uriFor(this[LOCATION], "uri");
  }

  get parentDirectory(): Directory {
    return new Directory(Paths.dirname(this.uri));
  }

  get extension(): string {
    return Paths.extname(this.uri);
  }

  get name(): string {
    return Paths.basename(this.uri);
  }

  get exists(): boolean {
    alive("File.exists");
    const location = this[LOCATION];
    checkpointSync(call("fs.exists", location.input));
    const hostPath = hostPathOf(location, "exists");
    if (!permissions(hostPath).has("read")) return false;
    return statOrNull(hostPath)?.isFile() === true;
  }

  get size(): number | null {
    alive("File.size");
    const location = this[LOCATION];
    checkpointSync(call("fs.size", location.input));
    try {
      const hostPath = requirePermission(location, "read", "size");
      const stat = statOrNull(hostPath);
      return stat && stat.isFile() ? stat.size : null;
    } catch {
      return null;
    }
  }

  get type(): string | null {
    return MIME_TYPES[posix.extname(this[LOCATION].hostPath ?? "").toLowerCase()] ?? null;
  }

  get md5(): string | null {
    try {
      return createHash("md5").update(this.bytesSync()).digest("hex");
    } catch {
      return null;
    }
  }

  get modificationTime(): number | null {
    const hostPath = this[LOCATION].hostPath;
    const stat = hostPath ? statOrNull(hostPath) : null;
    return stat ? Math.floor(stat.mtimeMs) : null;
  }

  get lastModified(): number | null {
    return this.modificationTime;
  }

  get creationTime(): number | null {
    const hostPath = this[LOCATION].hostPath;
    const stat = hostPath ? statOrNull(hostPath) : null;
    return stat ? Math.floor(stat.birthtimeMs) : null;
  }

  info(options?: { md5?: boolean }): Record<string, unknown> {
    const exists = this.exists;
    return {
      exists,
      uri: this.uri,
      size: exists ? this.size : undefined,
      modificationTime: exists ? this.modificationTime : undefined,
      creationTime: exists ? this.creationTime : undefined,
      md5: exists && options?.md5 ? this.md5 : undefined,
    };
  }

  delete(): void {
    alive("File.delete");
    const location = this[LOCATION];
    checkpointSync(call("fs.delete", location.input));
    const hostPath = requirePermission(location, "write", "delete");
    if (!statOrNull(hostPath)) throw fsError("delete", `Unable to delete '${location.input}': path does not exist`);
    fs.rmSync(hostPath, { recursive: true });
    checkpointSync(call("fs.delete", location.input), "after");
  }

  create(options?: { intermediates?: boolean; overwrite?: boolean }): void {
    alive("File.create");
    const location = this[LOCATION];
    checkpointSync(call("fs.create", location.input));
    const hostPath = requirePermission(location, "write", "create");
    const stat = statOrNull(hostPath);
    if (stat?.isDirectory()) throw fsError("create", "Unable to create file: a directory exists at this path");
    if (stat && !options?.overwrite) throw fsError("create", `Unable to create file: ${location.input} already exists`);
    if (options?.intermediates) fs.mkdirSync(posix.dirname(hostPath), { recursive: true });
    if (!statOrNull(posix.dirname(hostPath))?.isDirectory()) {
      throw fsError("create", "Unable to create file: parent directory does not exist");
    }
    fs.writeFileSync(hostPath, new Uint8Array());
  }

  write(content: string | Uint8Array, options?: { encoding?: "utf8" | "base64"; append?: boolean }): void {
    alive("File.write");
    const location = this[LOCATION];
    checkpointSync(call("fs.write", location.input));
    const hostPath = requirePermission(location, "write", "write");
    if (!statOrNull(posix.dirname(hostPath))?.isDirectory()) {
      throw fsError("write", "Unable to write file: parent directory does not exist");
    }
    const data = typeof content === "string"
      ? Buffer.from(content, options?.encoding === "base64" ? "base64" : "utf8")
      : Buffer.from(content.buffer, content.byteOffset, content.byteLength);
    if (options?.append) fs.appendFileSync(hostPath, data);
    else fs.writeFileSync(hostPath, data);
    checkpointSync(call("fs.write", location.input), "after");
  }

  private readHost(fn: string): Buffer {
    alive(`File.${fn}`);
    const location = this[LOCATION];
    checkpointSync(call("fs.read", location.input));
    const hostPath = requirePermission(location, "read", fn);
    try {
      return fs.readFileSync(hostPath);
    } catch (error) {
      throw fsError(fn, `Unable to read file: ${(error as Error).message}`);
    }
  }

  textSync(): string {
    return this.readHost("textSync").toString("utf8");
  }

  async text(): Promise<string> {
    await hop();
    return this.readHost("text").toString("utf8");
  }

  bytesSync(): Uint8Array<ArrayBuffer> {
    const buffer = this.readHost("bytesSync");
    return new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)) as Uint8Array<ArrayBuffer>;
  }

  async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    await hop();
    return this.bytesSync();
  }

  base64Sync(): string {
    return this.readHost("base64Sync").toString("base64");
  }

  async base64(): Promise<string> {
    await hop();
    return this.base64Sync();
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return (await this.bytes()).buffer;
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }

  open(mode?: FileMode): FileHandle {
    alive("File.open");
    const location = this[LOCATION];
    checkpointSync(call("fs.open", location.input));
    const resolvedMode = mode ?? FileMode.ReadWrite;
    const hostPath = requirePermission(location, resolvedMode === FileMode.ReadOnly ? "read" : "write", "open");
    if (!statOrNull(hostPath)) {
      if (harnessState().platform === "android" && resolvedMode !== FileMode.ReadOnly) {
        fs.writeFileSync(hostPath, new Uint8Array()); // RandomAccessFile("rw") creates the file
      } else {
        throw fsError("open", `Unable to open file handle: ${location.input} does not exist`);
      }
    }
    return new FileHandle(hostPath, resolvedMode);
  }

  async copy(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    alive("File.copy");
    await hop();
    const info = call("fs.copy", `${this[LOCATION].input} -> ${locationOf(destination).input}`);
    await checkpointAsync(info);
    relocate(this[LOCATION], destination, options, false, "copy");
    await checkpointAsync(info, "after");
  }

  copySync(destination: File | Directory, options?: RelocationOptions): void {
    alive("File.copySync");
    const info = call("fs.copy", `${this[LOCATION].input} -> ${locationOf(destination).input}`);
    checkpointSync(info);
    relocate(this[LOCATION], destination, options, false, "copySync");
    checkpointSync(info, "after");
  }

  async move(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    alive("File.move");
    await hop();
    const info = call("fs.move", `${this[LOCATION].input} -> ${locationOf(destination).input}`);
    await checkpointAsync(info);
    const target = relocate(this[LOCATION], destination, options, true, "move");
    this[LOCATION] = parseLocation(pathToFileURL(target).href, "file");
    await checkpointAsync(info, "after");
  }

  moveSync(destination: File | Directory, options?: RelocationOptions): void {
    alive("File.moveSync");
    const info = call("fs.move", `${this[LOCATION].input} -> ${locationOf(destination).input}`);
    checkpointSync(info);
    const target = relocate(this[LOCATION], destination, options, true, "moveSync");
    this[LOCATION] = parseLocation(pathToFileURL(target).href, "file");
  }

  rename(newName: string): void {
    alive("File.rename");
    if (!newName || newName.includes("/") || newName === "." || newName === "..") {
      throw fsError("rename", "child name must be a single path segment");
    }
    const location = this[LOCATION];
    checkpointSync(call("fs.rename", `${location.input} -> ${newName}`));
    const hostPath = requirePermission(location, "write", "rename");
    const target = posix.join(posix.dirname(hostPath), newName);
    fs.renameSync(hostPath, target);
    this[LOCATION] = parseLocation(pathToFileURL(target).href, "file");
  }

  static async downloadFileAsync(): Promise<never> {
    throw new Error("[native-sqlite] File.downloadFileAsync is not supported");
  }

  static async pickFileAsync(): Promise<never> {
    throw new Error("[native-sqlite] File.pickFileAsync is not supported (use expo-document-picker mock)");
  }
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

export class Directory {
  declare [LOCATION]: Location;

  constructor(...uris: (string | File | Directory)[]) {
    alive("Directory constructor");
    Object.defineProperty(this, LOCATION, {
      value: parseLocation(Paths.join(...uris), "directory"),
      writable: true,
      enumerable: false,
    });
    this.validatePath();
  }

  validatePath(): void {
    if (harnessState().platform === "ios" && this[LOCATION].failure) {
      throw fsError("validatePath", "tried to create a directory with a file path");
    }
  }

  get uri(): string {
    alive("Directory.uri");
    return uriFor(this[LOCATION], "uri");
  }

  get parentDirectory(): Directory {
    return new Directory(Paths.join(this.uri, ".."));
  }

  get name(): string {
    return Paths.basename(this.uri);
  }

  get exists(): boolean {
    alive("Directory.exists");
    const location = this[LOCATION];
    checkpointSync(call("fs.exists", location.input));
    const hostPath = hostPathOf(location, "exists");
    if (!permissions(hostPath).has("read")) return false;
    return statOrNull(hostPath)?.isDirectory() === true;
  }

  get size(): number | null {
    try {
      const hostPath = requirePermission(this[LOCATION], "read", "size");
      const walk = (target: string): number => fs.readdirSync(target, { withFileTypes: true })
        .reduce((total, entry) => {
          const child = posix.join(target, entry.name);
          return total + (entry.isDirectory() ? walk(child) : entry.isFile() ? fs.statSync(child).size : 0);
        }, 0);
      return walk(hostPath);
    } catch {
      return null;
    }
  }

  info(): Record<string, unknown> {
    const exists = this.exists;
    return { exists, uri: this.uri, size: exists ? this.size : undefined, files: exists ? this.listAsRecords().map((r) => r.uri) : undefined };
  }

  create(options?: { intermediates?: boolean; overwrite?: boolean; idempotent?: boolean }): void {
    alive("Directory.create");
    const location = this[LOCATION];
    checkpointSync(call("fs.create", location.input));
    const hostPath = requirePermission(location, "write", "create");
    const stat = statOrNull(hostPath);
    if (stat) {
      if (options?.idempotent && stat.isDirectory()) return;
      if (!options?.overwrite) throw fsError("create", `Unable to create directory: ${location.input} already exists`);
      fs.rmSync(hostPath, { recursive: true, force: true });
    }
    if (!options?.intermediates && !statOrNull(posix.dirname(hostPath))?.isDirectory()) {
      throw fsError("create", "Unable to create directory: parent directory does not exist");
    }
    fs.mkdirSync(hostPath, { recursive: options?.intermediates === true });
  }

  delete(): void {
    alive("Directory.delete");
    const location = this[LOCATION];
    checkpointSync(call("fs.delete", location.input));
    const hostPath = requirePermission(location, "write", "delete");
    if (!statOrNull(hostPath)) throw fsError("delete", `Unable to delete '${location.input}': path does not exist`);
    fs.rmSync(hostPath, { recursive: true });
  }

  listAsRecords(): { isDirectory: boolean; uri: string }[] {
    alive("Directory.list");
    const location = this[LOCATION];
    checkpointSync(call("fs.list", location.input));
    const hostPath = requirePermission(location, "read", "listAsRecords");
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(hostPath, { withFileTypes: true });
    } catch (error) {
      throw fsError("listAsRecords", `Unable to list directory: ${(error as Error).message}`);
    }
    // Real order is filesystem order; sorted here for deterministic tests.
    return entries
      .sort((first, second) => first.name.localeCompare(second.name))
      .map((entry) => {
        const child = posix.join(hostPath, entry.name);
        const isDirectory = entry.isDirectory();
        const href = pathToFileURL(child).href;
        return { isDirectory, uri: isDirectory ? `${href}/` : href };
      });
  }

  list(): (Directory | File)[] {
    return this.listAsRecords().map(({ isDirectory, uri }) => (isDirectory ? new Directory(uri) : new File(uri)));
  }

  createFile(name: string, _mimeType: string | null): File {
    const file = new File(this, name);
    file.create();
    return file;
  }

  createDirectory(name: string): Directory {
    const directory = new Directory(this, name);
    directory.create();
    return directory;
  }

  async copy(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    alive("Directory.copy");
    await hop();
    relocate(this[LOCATION], destination, options, false, "copy");
  }

  copySync(destination: File | Directory, options?: RelocationOptions): void {
    alive("Directory.copySync");
    relocate(this[LOCATION], destination, options, false, "copySync");
  }

  async move(destination: File | Directory, options?: RelocationOptions): Promise<void> {
    alive("Directory.move");
    await hop();
    const target = relocate(this[LOCATION], destination, options, true, "move");
    this[LOCATION] = parseLocation(pathToFileURL(target).href, "directory");
  }

  moveSync(destination: File | Directory, options?: RelocationOptions): void {
    alive("Directory.moveSync");
    const target = relocate(this[LOCATION], destination, options, true, "moveSync");
    this[LOCATION] = parseLocation(pathToFileURL(target).href, "directory");
  }

  rename(newName: string): void {
    alive("Directory.rename");
    const hostPath = requirePermission(this[LOCATION], "write", "rename");
    const target = posix.join(posix.dirname(hostPath), newName);
    fs.renameSync(hostPath, target);
    this[LOCATION] = parseLocation(pathToFileURL(target).href, "directory");
  }

  static async pickDirectoryAsync(): Promise<never> {
    throw new Error("[native-sqlite] Directory.pickDirectoryAsync is not supported");
  }
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function directoryUri(hostPath: string): string {
  const href = pathToFileURL(hostPath).href;
  return href.endsWith("/") ? href : `${href}/`;
}

export class Paths extends PathUtilities {
  /** iOS: <container>/Library/Caches/, Android: <container>/cache/ (file:// URI with trailing slash). */
  static get cache(): Directory {
    return new Directory(directoryUri(appLayout().cacheDir));
  }

  /** iOS: <container>/Documents/, Android: <container>/files/. */
  static get document(): Directory {
    return new Directory(directoryUri(appLayout().documentsDir));
  }

  static get bundle(): Directory {
    return new Directory(directoryUri(appLayout().bundleDir));
  }

  static get appleSharedContainers(): Record<string, Directory> {
    return {};
  }

  static get totalDiskSpace(): number {
    return 64 * 1024 ** 3;
  }

  static get availableDiskSpace(): number {
    return 32 * 1024 ** 3;
  }

  static info(...uris: string[]): { exists: boolean; isDirectory: boolean | null } {
    const location = parseLocation(uris.join("/"), "file");
    if (!location.hostPath) return { exists: false, isDirectory: null };
    const stat = statOrNull(location.hostPath);
    return { exists: stat !== null, isDirectory: stat ? stat.isDirectory() : null };
  }
}

export function newUuid(): string {
  return randomUUID();
}
