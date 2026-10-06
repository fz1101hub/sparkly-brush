import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

const DEVICE_ALIAS_PATTERN = /^ble-[0-9a-f]{24}$/;

export function deviceAlias(deviceId: string): string {
  if (DEVICE_ALIAS_PATTERN.test(deviceId)) return deviceId;
  return `ble-${bytesToHex(sha256(utf8ToBytes(deviceId))).slice(0, 24)}`;
}

export function sanitizeDeviceSessionId(sessionId: string): string {
  if (/^device-session-[0-9a-f]{24}-\d+-\d+$/.test(sessionId)) return sessionId;
  if (containsLikelyRawDeviceId(sessionId)) {
    return `device-session-${bytesToHex(sha256(utf8ToBytes(sessionId))).slice(0, 32)}`;
  }
  if (!sessionId.startsWith("ble-")) return sessionId;
  const trailingIdentity = sessionId.match(/-(\d+)-(\d+)$/);
  if (!trailingIdentity) return `device-session-${bytesToHex(sha256(utf8ToBytes(sessionId))).slice(0, 32)}`;
  return `device-session-${bytesToHex(sha256(utf8ToBytes(sessionId))).slice(0, 24)}-${trailingIdentity[1]}-${trailingIdentity[2]}`;
}

export function containsLikelyRawDeviceId(value: string): boolean {
  return /(?:[0-9a-f]{2}:){5}[0-9a-f]{2}/i.test(value)
    || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(value);
}
