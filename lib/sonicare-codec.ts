import type { StoredDeviceSession } from "./brush-types";
import { intensityFromByte } from "./sonicare-uuids";

function uint16LE(bytes: Uint8Array): number {
  return (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
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
    durationSeconds,
    targetSeconds,
    mode: bytes[10] === 0 ? "clean" : "unknown",
    intensity: intensityFromByte(bytes[11]),
  };
}
