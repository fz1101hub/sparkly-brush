import { beforeEach, describe, expect, it, vi } from "vitest";

import { createHardwareValidationRun } from "@/lib/hardware-validation";
import {
  clearHardwareValidationRun,
  loadHardwareValidationRun,
  saveHardwareValidationRun,
} from "@/lib/hardware-validation-storage";

const storage = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storage,
}));

function run(at: number) {
  return createHardwareValidationRun("android", "1.0.0", "36", at);
}

describe("hardware validation storage", () => {
  beforeEach(() => {
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    storage.removeItem.mockReset();
    storage.getItem.mockResolvedValue(null);
    storage.setItem.mockResolvedValue(undefined);
    storage.removeItem.mockResolvedValue(undefined);
  });

  it("serializza due salvataggi mantenendo l’ordine più recente", async () => {
    let releaseFirst: () => void = () => undefined;
    storage.setItem
      .mockImplementationOnce(() => new Promise<void>((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValueOnce(undefined);

    const first = saveHardwareValidationRun(run(1));
    const second = saveHardwareValidationRun(run(2));
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalledTimes(1));
    expect(storage.setItem.mock.calls[0][1]).toContain('"startedAt":1');

    releaseFirst();
    await Promise.all([first, second]);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(storage.setItem.mock.calls[1][1]).toContain('"startedAt":2');
  });

  it("non lascia la coda bloccata dopo un errore isolato", async () => {
    storage.setItem
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValueOnce(undefined);

    await expect(saveHardwareValidationRun(run(3))).rejects.toThrow("disk full");
    await expect(saveHardwareValidationRun(run(4))).resolves.toBeUndefined();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it("ordina clear e salvataggio quando usati in sequenza", async () => {
    const clear = clearHardwareValidationRun();
    const save = saveHardwareValidationRun(run(5));
    await Promise.all([clear, save]);

    expect(storage.removeItem.mock.invocationCallOrder[0])
      .toBeLessThan(storage.setItem.mock.invocationCallOrder[0]);
  });

  it("restituisce null per JSON non valido o versione non supportata", async () => {
    storage.getItem.mockResolvedValueOnce("not-json");
    await expect(loadHardwareValidationRun()).resolves.toBeNull();
    storage.getItem.mockResolvedValueOnce(JSON.stringify({ version: 99 }));
    await expect(loadHardwareValidationRun()).resolves.toBeNull();
  });
});
