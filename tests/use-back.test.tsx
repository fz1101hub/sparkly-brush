import React, { act } from "react";
import { createRoot } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const router = vi.hoisted(() => ({
  canGoBack: vi.fn(() => true),
  back: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("expo-router", () => ({ useRouter: () => router }));

import { useBack } from "@/hooks/use-back";

describe("useBack", () => {
  it("torna indietro quando c'è cronologia e altrimenti sostituisce con la home", async () => {
    let goBack!: () => void;
    function Probe() {
      goBack = useBack();
      return null;
    }
    const renderer = createRoot();
    await act(async () => renderer.render(<Probe />));

    goBack();
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();

    router.canGoBack.mockReturnValue(false);
    goBack();
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/");
    await act(async () => renderer.unmount());
  });
});
