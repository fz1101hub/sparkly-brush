/** Minimal `react-native` surface needed by the storage modules and expo-sqlite's JS layer. */
import { harnessState } from "../core/state";

export const Platform = {
  get OS(): "ios" | "android" {
    return harnessState().platform;
  },
  get Version(): string | number {
    return harnessState().platform === "android" ? 35 : "18.0";
  },
  select<T>(specifics: { ios?: T; android?: T; native?: T; default?: T }): T | undefined {
    const platform = harnessState().platform;
    return specifics[platform] ?? specifics.native ?? specifics.default;
  },
};

export const NativeModules: Record<string, unknown> = {};

export const PermissionsAndroid = {
  PERMISSIONS: {} as Record<string, string>,
  RESULTS: { GRANTED: "granted", DENIED: "denied", NEVER_ASK_AGAIN: "never_ask_again" },
  async request(): Promise<string> {
    return "granted";
  },
  async requestMultiple(): Promise<Record<string, string>> {
    return {};
  },
};

export default { Platform, NativeModules, PermissionsAndroid };
