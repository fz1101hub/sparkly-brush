/**
 * `expo-sharing` mock. `shareAsync(url)` records the call and (by default) copies the shared file
 * into `<testRoot>/external/shared/` — i.e. the user "saved it to Files". Availability and failures
 * are controlled through `harness.sharing` / fault api `sharing.share`.
 */
import fs from "node:fs";
import path from "node:path";

import { assertAlive, checkpointAsync, harnessState, hop } from "../core/state";

const MODULE_JS_EPOCH = harnessState().jsEpoch;

export async function isAvailableAsync(): Promise<boolean> {
  assertAlive(MODULE_JS_EPOCH, "Sharing.isAvailableAsync");
  await hop();
  return harnessState().sharingAvailable;
}

export async function shareAsync(url: string, options: Record<string, unknown> = {}): Promise<void> {
  assertAlive(MODULE_JS_EPOCH, "Sharing.shareAsync");
  await hop();
  const state = harnessState();
  await checkpointAsync({ api: "sharing.share", target: url });
  let hostPath: string | null = null;
  try {
    hostPath = decodeURIComponent(new URL(url).pathname);
  } catch {
    hostPath = null;
  }
  const existed = hostPath !== null && fs.existsSync(hostPath);
  let savedCopy: string | null = null;
  if (existed && hostPath && state.sharingSaveCopies && state.externalRoot) {
    const directory = path.join(state.externalRoot, "shared");
    fs.mkdirSync(directory, { recursive: true });
    savedCopy = path.join(directory, `${state.shared.length + 1}-${path.basename(hostPath)}`);
    fs.copyFileSync(hostPath, savedCopy);
  }
  state.shared.push({
    url,
    options,
    existed,
    size: existed && hostPath ? fs.statSync(hostPath).size : null,
    savedCopy,
  });
  await checkpointAsync({ api: "sharing.share", target: url }, "after");
}

export function getSharedPayloads(): unknown[] {
  return [];
}

export async function getResolvedSharedPayloadsAsync(): Promise<unknown[]> {
  return [];
}

export function clearSharedPayloads(): void {}

export function useIncomingShare(): { payloads: unknown[] } {
  return { payloads: [] };
}
