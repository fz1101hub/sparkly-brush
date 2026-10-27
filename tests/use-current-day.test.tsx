import React, { act } from "react";
import { createRoot } from "test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const appState = vi.hoisted(() => ({
  listeners: [] as ((state: string) => void)[],
}));

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn((_event: string, listener: (state: string) => void) => {
      appState.listeners.push(listener);
      return {
        remove: () => {
          appState.listeners = appState.listeners.filter((item) => item !== listener);
        },
      };
    }),
  },
}));

import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { computeBrushlingStats } from "@/lib/brushlings";
import { localDateKey } from "@/lib/day-progress";
import { computeMissionCenter } from "@/lib/missions";
import type { BrushSession } from "@/lib/brush-types";

async function renderDayProbe() {
  const seen: number[] = [];
  function Probe() {
    seen.push(useCurrentDayTimestamp());
    return null;
  }
  const renderer = createRoot();
  await act(async () => {
    renderer.render(<Probe />);
  });
  return { seen, unmount: () => act(() => renderer.unmount()) };
}

describe("useCurrentDayTimestamp", () => {
  beforeEach(() => {
    appState.listeners = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passa al nuovo giorno entro un minuto dalla mezzanotte e resta stabile durante il giorno", async () => {
    vi.setSystemTime(new Date(2026, 9, 6, 23, 58, 30));
    const { seen, unmount } = await renderDayProbe();
    expect(localDateKey(seen.at(-1)!)).toBe("2026-10-06");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    const rendersBeforeMidnight = seen.length;
    expect(localDateKey(seen.at(-1)!)).toBe("2026-10-06");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(localDateKey(seen.at(-1)!)).toBe("2026-10-07");
    expect(seen.length).toBe(rendersBeforeMidnight + 1);

    const firstOfNewDay = seen.at(-1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(seen.at(-1)).toBe(firstOfNewDay);
    await unmount();
  });

  it("aggiorna il giorno quando l'app torna in primo piano dopo la sospensione", async () => {
    vi.setSystemTime(new Date(2026, 9, 6, 21, 0, 0));
    const { seen, unmount } = await renderDayProbe();

    // Suspended overnight: no timer fired, the clock moved on.
    vi.setSystemTime(new Date(2026, 9, 7, 7, 30, 0));
    await act(async () => {
      appState.listeners.forEach((listener) => listener("active"));
    });
    expect(localDateKey(seen.at(-1)!)).toBe("2026-10-07");
    await unmount();
    expect(appState.listeners).toEqual([]);
  });
});

describe("statistiche del giorno con timestamp esplicito", () => {
  const evening: BrushSession = {
    id: "manual-evening",
    startedAt: new Date(2026, 9, 6, 20, 0, 0).getTime(),
    timeConfidence: "exact",
    rewardPolicy: "completed-only",
    durationSeconds: 120,
    targetSeconds: 120,
    completed: true,
    source: "manual",
  };
  const morning: BrushSession = {
    ...evening,
    id: "manual-morning",
    startedAt: new Date(2026, 9, 6, 7, 30, 0).getTime(),
  };

  it("non mostra le missioni di ieri come completate oggi", () => {
    const history = [evening, morning];
    const sameDay = new Date(2026, 9, 6, 22, 0, 0).getTime();
    const nextDay = new Date(2026, 9, 7, 7, 0, 0).getTime();

    expect(computeMissionCenter(history, sameDay).today.completedCount).toBe(3);
    expect(computeMissionCenter(history, nextDay).today.completedCount).toBe(0);
    expect(computeBrushlingStats(history, sameDay).todayCompletedSessions).toBe(2);
    expect(computeBrushlingStats(history, nextDay).todayCompletedSessions).toBe(0);
    expect(computeBrushlingStats(history, nextDay).currentStreakDays).toBe(1);
  });
});
