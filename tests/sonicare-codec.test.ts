import { describe, expect, it } from "vitest";

import { decodeKidsSession, reconstructSessionStart } from "../lib/sonicare-codec";

function fromHex(hex: string) {
  return Uint8Array.from(hex.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);
}

describe("decodeKidsSession", () => {
  it("decodifica una cattura reale HX6340 compatibile HX63xx", () => {
    const result = decodeKidsSession(fromHex("6cda92017a0113003c00020000000000"), 378);
    expect(result).toEqual({
      sessionId: 378,
      handleTimestampSeconds: 26_401_388,
      durationSeconds: 19,
      targetSeconds: 60,
      mode: "unknown",
      intensity: "bassa",
    });
  });

  it("rifiuta record corti o riferiti a un’altra sessione", () => {
    expect(decodeKidsSession(fromHex("000102"))).toBeNull();
    expect(decodeKidsSession(fromHex("6cda92017a0113003c00020000000000"), 379)).toBeNull();
  });

  it("rifiuta durate non plausibili", () => {
    expect(decodeKidsSession(fromHex("6cda92017a01ff7f3c00020000000000"), 378)).toBeNull();
  });

  it("ricostruisce l'orario da un clock relativo anche attraverso rollover uint32", () => {
    const anchorWallTime = new Date(2026, 8, 23, 12).getTime();
    expect(reconstructSessionStart({
      recordHandleTimestampSeconds: 0xffff_ff00,
      currentHandleTimestampSeconds: 0x0000_0100,
      anchorWallTime,
      durationSeconds: 120,
    })).toEqual({
      startedAt: anchorWallTime - 512_000,
      timeConfidence: "reconstructed",
    });
  });

  it("marca come approssimato un delta di clock implausibile", () => {
    const anchorWallTime = new Date(2026, 8, 23, 12).getTime();
    expect(reconstructSessionStart({
      recordHandleTimestampSeconds: 10,
      currentHandleTimestampSeconds: 40_000_000,
      anchorWallTime,
      durationSeconds: 90,
    })).toEqual({
      startedAt: anchorWallTime - 90_000,
      timeConfidence: "approximate",
    });
  });
});
