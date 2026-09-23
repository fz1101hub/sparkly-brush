import { describe, expect, it } from "vitest";

import {
  isRestoreOperationActive,
  runHistoryOperation,
  runRestoreOperation,
  subscribeRestoreOperation,
} from "@/lib/history-operation";

describe("history operation barrier", () => {
  it("fa attendere una sessione arrivata durante il restore", async () => {
    const events: string[] = [];
    let releaseRestore: () => void = () => undefined;
    const restoreGate = new Promise<void>((resolve) => { releaseRestore = resolve; });

    const restore = runHistoryOperation(async () => {
      events.push("restore-start");
      await restoreGate;
      events.push("restore-end");
    });
    const session = runHistoryOperation(async () => {
      events.push("session");
    });

    await Promise.resolve();
    expect(events).toEqual(["restore-start"]);
    releaseRestore();
    await Promise.all([restore, session]);
    expect(events).toEqual(["restore-start", "restore-end", "session"]);
  });

  it("espone il blocco globale dalla messa in coda fino al completamento", async () => {
    let releaseRestore: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { releaseRestore = resolve; });
    const states: boolean[] = [];
    const unsubscribe = subscribeRestoreOperation(() => states.push(isRestoreOperationActive()));

    const restore = runRestoreOperation(async () => gate);
    expect(isRestoreOperationActive()).toBe(true);
    releaseRestore();
    await restore;

    expect(isRestoreOperationActive()).toBe(false);
    expect(states).toEqual([true, false]);
    unsubscribe();
  });
});
