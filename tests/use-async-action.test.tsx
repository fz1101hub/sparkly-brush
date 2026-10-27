import React, { act } from "react";
import { createRoot } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const dialogs = vi.hoisted(() => ({ showMessage: vi.fn() }));
vi.mock("@/lib/dialogs", () => ({ showMessage: dialogs.showMessage }));

import { useAsyncAction } from "@/hooks/use-async-action";

describe("useAsyncAction", () => {
  it("avvisa quando l'azione fallisce e tace quando riesce", async () => {
    let run!: ReturnType<typeof useAsyncAction>;
    function Probe() {
      run = useAsyncAction();
      return null;
    }
    const renderer = createRoot();
    await act(async () =>
      renderer.render(
        <TestLocaleProvider locale="it">
          <Probe />
        </TestLocaleProvider>,
      ),
    );

    await act(async () => {
      run(Promise.resolve("ok"));
      await Promise.resolve();
    });
    expect(dialogs.showMessage).not.toHaveBeenCalled();

    await act(async () => {
      run(Promise.reject(new Error("storage unavailable")));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(dialogs.showMessage).toHaveBeenCalledWith(
      "Operazione non riuscita",
      "Riprova tra poco. Se il problema continua, chiudi e riapri l’app.",
    );
    await act(async () => renderer.unmount());
  });
});
