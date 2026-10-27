import AsyncStorage from "@react-native-async-storage/async-storage";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

import type { ParentChallenge } from "@/lib/parent-gate";

/**
 * The parents' own lock (voce 65), an alternative to the multiplication that older children
 * learn quickly: a PIN of 4–6 digits and, where the phone has one, the fingerprint or Face ID.
 * Family-wide and kept on this phone only (not in the backup); only a salted hash is stored.
 */
export const PARENT_LOCK_KEY = "brushlings.parent-lock.v1";
export const PIN_PATTERN = /^\d{4,6}$/;
const ITERATIONS = 4_000;

export type StoredPin = { salt: string; hash: string };
export type ParentLock = { version: 1; pin: StoredPin | null; biometrics: boolean };
export const DEFAULT_PARENT_LOCK: ParentLock = { version: 1, pin: null, biometrics: false };

const HEX = /^[0-9a-f]+$/;

export function normalizeParentLock(raw: unknown): ParentLock {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<ParentLock>;
  const pin = value.pin
    && typeof value.pin.salt === "string" && HEX.test(value.pin.salt)
    && typeof value.pin.hash === "string" && HEX.test(value.pin.hash) && value.pin.hash.length === 64
    ? { salt: value.pin.salt, hash: value.pin.hash }
    : null;
  // Biometrics only replace the PIN as a quicker way in: without a PIN there is nothing to fall back on.
  return { version: 1, pin, biometrics: pin !== null && value.biometrics === true };
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return bytesToHex(await pbkdf2Async(sha256, utf8ToBytes(pin), utf8ToBytes(salt), { c: ITERATIONS, dkLen: 32 }));
}

export async function createPin(pin: string, random: () => number = Math.random): Promise<StoredPin> {
  if (!PIN_PATTERN.test(pin)) throw new Error("PIN non valido");
  const salt = Array.from({ length: 16 }, () => Math.floor(random() * 256).toString(16).padStart(2, "0")).join("");
  return { salt, hash: await hashPin(pin, salt) };
}

export async function isPinCorrect(stored: StoredPin, input: string): Promise<boolean> {
  if (!PIN_PATTERN.test(input)) return false;
  return (await hashPin(input, stored.salt)) === stored.hash;
}

export async function loadParentLock(): Promise<ParentLock> {
  try {
    const raw = await AsyncStorage.getItem(PARENT_LOCK_KEY);
    return raw ? normalizeParentLock(JSON.parse(raw)) : { ...DEFAULT_PARENT_LOCK };
  } catch {
    return { ...DEFAULT_PARENT_LOCK };
  }
}

export async function saveParentLock(lock: ParentLock): Promise<void> {
  await AsyncStorage.setItem(PARENT_LOCK_KEY, JSON.stringify(normalizeParentLock(lock)));
}

/**
 * For a forgotten PIN: a two-digit by one-digit multiplication (12–29 × 6–9), harder than the
 * everyday question, that opens the parent area once so the PIN can be changed or removed.
 */
export function createRecoveryChallenge(random: () => number = Math.random): ParentChallenge {
  const first = 12 + Math.min(17, Math.max(0, Math.floor(random() * 18)));
  const second = 6 + Math.min(3, Math.max(0, Math.floor(random() * 4)));
  return { first, second, answer: first * second };
}
