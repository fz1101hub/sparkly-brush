import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Metro turns `require("@/assets/…png")` into an asset id. Under Vitest the same call reaches
// Node's require, which knows neither the "@/" alias nor image files: give it both, so the
// approved artwork can be rendered in component tests.
const root = fileURLToPath(new URL("../..", import.meta.url));
const ASSET_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".ttf", ".otf"];

type NodeModuleInternals = {
  _resolveFilename: (request: string, ...rest: unknown[]) => string;
  _extensions: Record<string, (module: { exports: unknown }, filename: string) => void>;
};
const internals = Module as unknown as NodeModuleInternals;
const resolveFilename = internals._resolveFilename;
internals._resolveFilename = function (request: string, ...rest: unknown[]) {
  const resolved = request.startsWith("@/") ? path.join(root, request.slice(2)) : request;
  return resolveFilename.call(this, resolved, ...rest);
};
for (const extension of ASSET_EXTENSIONS) {
  internals._extensions[extension] = (module, filename) => {
    module.exports = { testAsset: path.relative(root, filename) };
  };
}
