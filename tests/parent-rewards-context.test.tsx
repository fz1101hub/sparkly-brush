import React, { act } from "react";
import { createRoot } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const memory = vi.hoisted(() => new Map<string, string>());

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: async (key: string) => {
      memory.delete(key);
    },
  },
}));
vi.mock("@/contexts/brush-context", async () => {
  const { createEmptyLifetimeProgress } = await import("@/lib/lifetime-progress");
  const lifetimeProgress = createEmptyLifetimeProgress();
  return { useBrush: () => ({ history: [], lifetimeProgress, demoMode: false }) };
});

import { ParentRewardsProvider, useParentRewards } from "@/contexts/parent-rewards-context";
import { MAX_PARENT_REWARD_TITLE_LENGTH, MAX_PARENT_REWARDS } from "@/lib/parent-rewards";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

describe("ParentRewardsProvider", () => {
  it("non supera il limite di premi conservato dai backup e accorcia i titoli troppo lunghi", async () => {
    let current!: ReturnType<typeof useParentRewards>;
    function Probe() {
      current = useParentRewards();
      return null;
    }
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <ParentRewardsProvider>
            <Probe />
          </ParentRewardsProvider>
        </TestLocaleProvider>,
      );
    });

    await act(async () => {
      await current.addReward("x".repeat(MAX_PARENT_REWARD_TITLE_LENGTH + 20), "completed-sessions", 5);
    });
    expect(current.definitions[0].title).toHaveLength(MAX_PARENT_REWARD_TITLE_LENGTH);

    for (let index = 1; index <= MAX_PARENT_REWARDS; index += 1) {
      await act(async () => {
        await current.addReward(`Premio ${index}`, "completed-sessions", 5);
      });
    }
    expect(current.definitions).toHaveLength(MAX_PARENT_REWARDS);
    expect(JSON.parse(memory.get("sparkly-brush.parent-rewards.v1") ?? "[]")).toHaveLength(MAX_PARENT_REWARDS);
    await act(async () => renderer.unmount());
  });
});
