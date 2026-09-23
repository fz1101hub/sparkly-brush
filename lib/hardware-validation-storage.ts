import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeHardwareValidationRun,
  type HardwareValidationRun,
} from "./hardware-validation";

const STORAGE_KEY = "sparkly-brush.hardware-validation.v1";
let writeQueue: Promise<void> = Promise.resolve();

export async function loadHardwareValidationRun(): Promise<HardwareValidationRun | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return normalizeHardwareValidationRun(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function saveHardwareValidationRun(run: HardwareValidationRun): Promise<void> {
  const serialized = JSON.stringify(run);
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, serialized));
  return writeQueue;
}

export function clearHardwareValidationRun(): Promise<void> {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(STORAGE_KEY));
  return writeQueue;
}
