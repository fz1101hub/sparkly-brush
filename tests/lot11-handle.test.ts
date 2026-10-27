import { describe, expect, it } from "vitest";

import { addZoneSeconds, forgottenZone, motorHours, quadrantFromByte } from "@/lib/handle-zones";

describe("funzioni sperimentali del manico (lotto 11)", () => {
  it("legge il quadrante del manico (0–3) e ignora gli altri valori", () => {
    expect([0, 1, 3, 4, 5, -1, 1.5, undefined].map((value) => quadrantFromByte(value))).toEqual([0, 1, 3, null, null, null, null, null]);
  });

  it("somma i secondi per zona e ignora salti anomali", () => {
    let seconds: number[] = [];
    seconds = addZoneSeconds(seconds, 0, 1);
    seconds = addZoneSeconds(seconds, 0, 2);
    seconds = addZoneSeconds(seconds, 2, 1);
    seconds = addZoneSeconds(seconds, 1, 45);
    seconds = addZoneSeconds(seconds, null, 1);
    expect(seconds).toEqual([3, 0, 1, 0]);
  });

  it("riconosce la zona trascurata solo quando è chiaramente più corta", () => {
    expect(forgottenZone([30, 30, 8, 30])).toBe(2);
    expect(forgottenZone([30, 28, 25, 30])).toBeNull();
    expect(forgottenZone([10, 10, 0, 10])).toBeNull();
  });

  it("tempo motore in ore", () => {
    expect(motorHours(5_400)).toBe(1.5);
    expect(motorHours(undefined)).toBeNull();
  });
});
