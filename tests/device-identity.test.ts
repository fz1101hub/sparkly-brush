import { describe, expect, it } from "vitest";

import {
  containsLikelyRawDeviceId,
  deviceAlias,
  sanitizeDeviceSessionId,
} from "@/lib/device-identity";
import { createEmptyLifetimeProgress, normalizeLifetimeProgress } from "@/lib/lifetime-progress";

describe("device identity privacy", () => {
  it("produce alias stabili senza esporre MAC o UUID", () => {
    const mac = "AA:BB:CC:DD:EE:FF";
    const uuid = "123e4567-e89b-12d3-a456-426614174000";

    expect(deviceAlias(mac)).toMatch(/^ble-[0-9a-f]{24}$/);
    expect(deviceAlias(mac)).toBe(deviceAlias(mac));
    expect(deviceAlias(uuid)).not.toContain(uuid);
    expect(containsLikelyRawDeviceId(deviceAlias(mac))).toBe(false);
  });

  it("rende anonimi gli ID sessione legacy e lascia stabili quelli già migrati", () => {
    const legacy = "ble-AA%3ABB%3ACC%3ADD%3AEE%3AFF-2-42";
    const sanitized = sanitizeDeviceSessionId(legacy);

    expect(sanitized).toMatch(/^device-session-[0-9a-f]{24}-2-42$/);
    expect(sanitized).toBe(sanitizeDeviceSessionId(sanitized));
    expect(sanitized).not.toContain("AA");
  });

  it("elimina MAC e UUID anche dagli ID sessione legacy non prefissati", () => {
    for (const raw of [
      "session-AA:BB:CC:DD:EE:FF-42",
      "session-123e4567-e89b-12d3-a456-426614174000-42",
    ]) {
      const sanitized = sanitizeDeviceSessionId(raw);
      expect(sanitized).not.toBe(raw);
      expect(containsLikelyRawDeviceId(sanitized)).toBe(false);
    }
  });

  it("migra cursori e fallback legacy senza conservare la chiave MAC", () => {
    const mac = "AA:BB:CC:DD:EE:FF";
    const base = createEmptyLifetimeProgress();
    const normalized = normalizeLifetimeProgress({
      ...base,
      deviceCursors: {
        [encodeURIComponent(mac)]: {
          lastSessionId: 42,
          epoch: 0,
          recentIdentities: ["0:42"],
          updatedAt: 1,
        },
      },
      pendingDeviceFallbacks: {
        [encodeURIComponent(mac)]: {
          sessionId: `ble-${encodeURIComponent(mac)}-0-43`,
          startedAt: 1,
          durationSeconds: 120,
          targetSeconds: 120,
        },
      },
    });

    expect(normalized).not.toBeNull();
    expect(Object.keys(normalized?.deviceCursors ?? {})).toEqual([deviceAlias(mac)]);
    expect(Object.values(normalized?.pendingDeviceFallbacks ?? {})).toHaveLength(1);
    expect(Object.values(normalized?.pendingDeviceFallbacks ?? {})[0]?.deviceKey).toBe(deviceAlias(mac));
  });
});
