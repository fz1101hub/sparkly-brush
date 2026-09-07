import { describe, expect, it } from "vitest";

import { decodeKidsSession } from "../lib/sonicare-codec";

function fromHex(hex: string) {
  return Uint8Array.from(hex.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? []);
}

describe("decodeKidsSession", () => {
  it("decodifica una cattura reale HX6340 compatibile HX63xx", () => {
    const result = decodeKidsSession(fromHex("6cda92017a0113003c00020000000000"), 378);
    expect(result).toEqual({
      sessionId: 378,
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
});
