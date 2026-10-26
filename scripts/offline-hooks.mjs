// Dependency-free checks for the pure/storage domain code. This is not an Expo build.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@react-native-async-storage/async-storage") {
      return { url: new URL("../tests/offline/storage.mjs", import.meta.url).href, shortCircuit: true };
    }
    let path;
    if (specifier.startsWith("@/")) path = resolve(root, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      path = resolve(dirname(fileURLToPath(context.parentURL)), specifier);
    }
    if (path) {
      for (const candidate of [path, `${path}.ts`, `${path}.mjs`]) {
        if (existsSync(candidate)) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});
