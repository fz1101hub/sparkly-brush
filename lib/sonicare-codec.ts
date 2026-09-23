import type { StoredDeviceSession } from "./brush-types";
import { intensityFromByte } from "./sonicare-uuids";

function uint16LE(bytes: Uint8Array): number {
  return (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
}

export function uint32LE(bytes: Uint8Array): number {
  return (
    (bytes[0] ?? 0)
    + (bytes[1] ?? 0) * 0x100
    + (bytes[2] ?? 0) * 0x1_0000
    + (bytes[3] ?? 0) * 0x100_0000
  ) >>> 0;
}

const MAX_RECONSTRUCTED_AGE_SECONDS = 366 * 24 * 60 * 60;

export function reconstructSessionStart(input: {
  recordHandleTimestampSeconds: number;
  currentHandleTimestampSeconds: number;
  anchorWallTime: number;
  durationSeconds: number;
}): { startedAt: number; timeConfidence: "reconstructed" | "approximate" } {
  const ageSeconds = (
    input.currentHandleTimestampSeconds - input.recordHandleTimestampSeconds
  ) >>> 0;
  if (ageSeconds <= MAX_RECONSTRUCTED_AGE_SECONDS) {
    return {
      startedAt: input.anchorWallTime - ageSeconds * 1_000,
      timeConfidence: "reconstructed",
    };
  }
  return {
    startedAt: input.anchorWallTime - input.durationSeconds * 1_000,
    timeConfidence: "approximate",
  };
}

export function decodeKidsSession(bytes: Uint8Array, expectedSessionId?: number): StoredDeviceSession | null {
  if (bytes.length < 14) return null;

  const sessionId = uint16LE(bytes.slice(4, 6));
  const durationSeconds = uint16LE(bytes.slice(6, 8));
  const targetSeconds = uint16LE(bytes.slice(8, 10));

  if (
    (expectedSessionId !== undefined && sessionId !== expectedSessionId)
    || targetSeconds <= 0
    || targetSeconds > 3600
    || durationSeconds > targetSeconds * 2
  ) {
    return null;
  }

  return {
    sessionId,
    handleTimestampSeconds: uint32LE(bytes.slice(0, 4)),
    durationSeconds,
    targetSeconds,
    mode: bytes[10] === 0 ? "clean" : "unknown",
    intensity: intensityFromByte(bytes[11]),
  };
}
