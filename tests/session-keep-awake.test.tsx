import React, { act } from "react";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ activate: vi.fn(), deactivate: vi.fn() }));
vi.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: mocks.activate,
  deactivateKeepAwake: mocks.deactivate,
}));

import { useSessionKeepAwake } from "@/hooks/use-session-keep-awake";

function Session() {
  useSessionKeepAwake();
  return null;
}

async function mount() {
  const renderer = createRoot();
  await act(async () => renderer.render(<Session />));
  return renderer;
}

describe("session screen wake lock", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.activate.mockResolvedValue(undefined);
    mocks.deactivate.mockResolvedValue(undefined);
  });

  it("continues when permission is denied and does not release an absent lock", async () => {
    mocks.activate.mockRejectedValue(new Error("Permission denied"));
    const renderer = await mount();
    await act(async () => renderer.unmount());
    expect(mocks.activate).toHaveBeenCalledOnce();
    expect(mocks.deactivate).not.toHaveBeenCalled();
  });

  it("releases the acquired lock when the session ends", async () => {
    const renderer = await mount();
    const tag = mocks.activate.mock.calls[0][0];
    expect(mocks.deactivate).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
    expect(mocks.deactivate).toHaveBeenCalledExactlyOnceWith(tag);
  });

  it("releases a lock that arrives after the session has already ended", async () => {
    let resolve!: () => void;
    mocks.activate.mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    const renderer = await mount();
    await act(async () => renderer.unmount());
    expect(mocks.deactivate).not.toHaveBeenCalled();
    await act(async () => resolve());
    expect(mocks.deactivate).toHaveBeenCalledExactlyOnceWith(mocks.activate.mock.calls[0][0]);
  });

  it("handles release failures without an unhandled rejection", async () => {
    mocks.deactivate.mockRejectedValue(new Error("Already released"));
    const renderer = await mount();
    await act(async () => renderer.unmount());
    expect(mocks.deactivate).toHaveBeenCalledOnce();
  });
});
