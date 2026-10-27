/**
 * In-memory `@react-native-async-storage/async-storage` (v2 API surface) whose contents live in the
 * global harness state, so they survive simulated app restarts (vi.resetModules) and are wiped by
 * `freshInstall()`. Mirrors the real JS layer's quirks:
 *  - getItem returns null for an empty-string value (`result?.[0]?.[1] ? ... : null`)
 *  - setItem/mergeItem reject null/undefined values; non-string values are rejected here (the real
 *    native module cannot store them either)
 *  - multiSet / multiRemove are applied atomically (Android SQLite-backed behaviour)
 * Every call goes through the fault-injection checkpoints `asyncStorage.<method>` (target = key(s)).
 */
import {
  assertAlive,
  checkpointAsync,
  harnessState,
  hop,
  traceError,
} from "../core/state";

const MODULE_JS_EPOCH = harnessState().jsEpoch;

type Callback<T> = ((error?: Error | null, result?: T) => void) | undefined;
type KeyValuePair = [string, string | null];

function checkKey(key: unknown): void {
  if (typeof key !== "string") {
    console.warn(`[AsyncStorage] Using ${typeof key} type for key is not supported. This can lead to unexpected behavior/errors. Use string instead.\nKey passed: ${String(key)}\n`);
  }
}

function checkValue(key: unknown, value: unknown): void {
  if (value == null) {
    throw new Error(`[AsyncStorage] Passing null/undefined as value is not supported. If you want to remove value, Use .removeItem method instead.\nPassed value: ${String(value)}\nPassed key: ${String(key)}\n`);
  }
  if (typeof value !== "string") {
    throw new Error(`[native-sqlite] AsyncStorage value for key "${String(key)}" is not a string (native module would fail)`);
  }
}

async function run<T>(api: string, target: string, operation: () => T, callback?: Callback<T>): Promise<T> {
  const info = { api: `asyncStorage.${api}`, target };
  try {
    assertAlive(MODULE_JS_EPOCH, `AsyncStorage.${api}`);
    await hop();
    assertAlive(MODULE_JS_EPOCH, `AsyncStorage.${api}`);
    await checkpointAsync(info);
    const result = operation();
    await checkpointAsync(info, "after");
    callback?.(null, result);
    return result;
  } catch (error) {
    traceError(info, error);
    callback?.(error as Error);
    throw error;
  }
}

function store(): Map<string, string> {
  return harnessState().asyncStorage;
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (!base || typeof base !== "object" || Array.isArray(base) || !patch || typeof patch !== "object" || Array.isArray(patch)) {
    return patch;
  }
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    result[key] = key in result ? deepMerge(result[key], value) : value;
  }
  return result;
}

function mergeValue(key: string, value: string): void {
  const current = store().get(key);
  if (current === undefined) {
    store().set(key, value);
    return;
  }
  store().set(key, JSON.stringify(deepMerge(JSON.parse(current), JSON.parse(value))));
}

const AsyncStorage = {
  getItem(key: string, callback?: Callback<string | null>): Promise<string | null> {
    checkKey(key);
    return run("getItem", key, () => {
      const value = store().get(key);
      return value ? value : null;
    }, callback);
  },

  setItem(key: string, value: string, callback?: Callback<void>): Promise<void> {
    checkKey(key);
    try {
      checkValue(key, value);
    } catch (error) {
      callback?.(error as Error);
      return Promise.reject(error);
    }
    return run("setItem", key, () => {
      store().set(key, value);
    }, callback);
  },

  removeItem(key: string, callback?: Callback<void>): Promise<void> {
    checkKey(key);
    return run("removeItem", key, () => {
      store().delete(key);
    }, callback);
  },

  mergeItem(key: string, value: string, callback?: Callback<void>): Promise<void> {
    checkKey(key);
    try {
      checkValue(key, value);
    } catch (error) {
      callback?.(error as Error);
      return Promise.reject(error);
    }
    return run("mergeItem", key, () => mergeValue(key, value), callback);
  },

  clear(callback?: Callback<void>): Promise<void> {
    return run("clear", "*", () => {
      store().clear();
    }, callback);
  },

  getAllKeys(callback?: Callback<readonly string[]>): Promise<readonly string[]> {
    return run("getAllKeys", "*", () => [...store().keys()], callback);
  },

  flushGetRequests(): void {},

  multiGet(keys: readonly string[], callback?: Callback<readonly KeyValuePair[]>): Promise<readonly KeyValuePair[]> {
    keys.forEach(checkKey);
    return run("multiGet", keys.join(","), () => keys.map((key): KeyValuePair => [key, store().get(key) ?? null]), callback);
  },

  multiSet(pairs: readonly (readonly [string, string])[], callback?: Callback<void>): Promise<void> {
    if (!Array.isArray(pairs) || pairs.length === 0 || !Array.isArray(pairs[0])) {
      return Promise.reject(new Error("[AsyncStorage] Expected array of key-value pairs as first argument to multiSet"));
    }
    try {
      pairs.forEach(([key, value]) => {
        checkKey(key);
        checkValue(key, value);
      });
    } catch (error) {
      callback?.(error as Error);
      return Promise.reject(error);
    }
    return run("multiSet", pairs.map(([key]) => key).join(","), () => {
      pairs.forEach(([key, value]) => store().set(key, value));
    }, callback);
  },

  multiRemove(keys: readonly string[], callback?: Callback<void>): Promise<void> {
    keys.forEach(checkKey);
    return run("multiRemove", keys.join(","), () => {
      keys.forEach((key) => store().delete(key));
    }, callback);
  },

  multiMerge(pairs: readonly (readonly [string, string])[], callback?: Callback<void>): Promise<void> {
    return run("multiMerge", pairs.map(([key]) => key).join(","), () => {
      pairs.forEach(([key, value]) => mergeValue(key, value));
    }, callback);
  },
};

export function useAsyncStorage(key: string) {
  return {
    getItem: (callback?: Callback<string | null>) => AsyncStorage.getItem(key, callback),
    setItem: (value: string, callback?: Callback<void>) => AsyncStorage.setItem(key, value, callback),
    mergeItem: (value: string, callback?: Callback<void>) => AsyncStorage.mergeItem(key, value, callback),
    removeItem: (callback?: Callback<void>) => AsyncStorage.removeItem(key, callback),
  };
}

export default AsyncStorage;
