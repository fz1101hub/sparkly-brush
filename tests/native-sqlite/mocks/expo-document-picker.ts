/**
 * `expo-document-picker` mock. Picks are queued by the test with `harness.documentPicker.pick(hostPath)`
 * (or `.cancel()`); an empty queue behaves like the user cancelling. With `copyToCacheDirectory`
 * (default true) the file is copied, like on iOS, to `<cache>/DocumentPicker/<UUID>.<ext>` and that
 * file:// URI is returned.
 */
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { appLayout, assertAlive, checkpointAsync, harnessState, hop } from "../core/state";

const MODULE_JS_EPOCH = harnessState().jsEpoch;

export type DocumentPickerAsset = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
  lastModified: number;
  file?: undefined;
  base64?: string;
};

export type DocumentPickerResult =
  | { canceled: false; assets: DocumentPickerAsset[]; output?: undefined }
  | { canceled: true; assets: null; output?: undefined };

export async function getDocumentAsync(options: {
  type?: string | string[];
  copyToCacheDirectory?: boolean;
  multiple?: boolean;
  base64?: boolean;
} = {}): Promise<DocumentPickerResult> {
  assertAlive(MODULE_JS_EPOCH, "DocumentPicker.getDocumentAsync");
  await hop();
  const state = harnessState();
  await checkpointAsync({ api: "documentPicker.pick", target: JSON.stringify(options.type ?? "*/*") });
  const next = state.pickerQueue.shift();
  if (!next || next.kind === "cancel" || !next.sourcePath) return { canceled: true, assets: null };
  const source = next.sourcePath;
  const stat = fs.statSync(source);
  let resultPath = source;
  if (options.copyToCacheDirectory !== false) {
    const directory = path.join(appLayout().cacheDir, "DocumentPicker");
    fs.mkdirSync(directory, { recursive: true });
    resultPath = path.join(directory, `${randomUUID().toUpperCase()}${path.extname(next.name ?? source)}`);
    fs.copyFileSync(source, resultPath);
  }
  return {
    canceled: false,
    assets: [{
      uri: pathToFileURL(resultPath).href,
      name: next.name ?? path.basename(source),
      size: stat.size,
      mimeType: next.mimeType ?? "application/octet-stream",
      lastModified: Math.floor(stat.mtimeMs),
    }],
  };
}
