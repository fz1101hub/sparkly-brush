import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { STARTER_IDS } from "@/lib/brushlings";
import {
  HARDWARE_TEST_CASES,
  type HardwareTestStatus,
} from "@/lib/hardware-validation";

const ROOT = process.cwd();
const SOURCE_ROOTS = ["app", "components"];
const HARDWARE_STATUSES: HardwareTestStatus[] = [
  "pending",
  "passed",
  "failed",
  "blocked",
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function declaredTestIds(): Set<string> {
  const ids = new Set<string>();
  for (const root of SOURCE_ROOTS) {
    for (const path of sourceFiles(join(ROOT, root))) {
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(
        /(?:testID|tabBarButtonTestID)\s*[:=]\s*["']([^"']+)["']/g,
      )) {
        ids.add(match[1]);
      }
    }
  }
  for (const id of STARTER_IDS) ids.add(`starter-${id}`);
  ids.add("history-session-0");
  for (const test of HARDWARE_TEST_CASES) {
    for (const status of HARDWARE_STATUSES) {
      ids.add(`hardware-status-${test.id}-${status}`);
      ids.add(`hardware-status-${test.id}-${status}-selected`);
    }
  }
  for (
    let completed = 0;
    completed <= HARDWARE_TEST_CASES.length;
    completed += 1
  ) {
    ids.add(`hardware-checklist-saved-${completed}`);
  }
  ids.add("hardware-checklist-saving");
  ids.add("hardware-checklist-error");
  ids.add("backup-comparison-file");
  ids.add("backup-confirm-file-card");
  ids.add("backup-cancel-file");
  ids.add("backup-confirm-file");
  return ids;
}

function referencedFlowIds(): string[] {
  const flowDirectory = join(ROOT, ".maestro", "flows");
  return readdirSync(flowDirectory)
    .filter((name) => name.endsWith(".yaml"))
    .flatMap((name) => {
      const source = readFileSync(join(flowDirectory, name), "utf8");
      return [...source.matchAll(/^\s+id:\s*([^\s#]+)\s*$/gm)].map(
        (match) => match[1],
      );
    });
}

describe("Maestro selector contract", () => {
  it("riferisce soltanto testID esposti dall'app", () => {
    const declared = declaredTestIds();
    const missing = referencedFlowIds().filter((id) => !declared.has(id));
    expect(missing).toEqual([]);
  });

  it("scorre fino alla conferma starter prima del tap su schermi compatti", () => {
    const flowDirectory = join(ROOT, ".maestro", "flows");
    for (const name of readdirSync(flowDirectory).filter((entry) =>
      entry.endsWith(".yaml"),
    )) {
      const source = readFileSync(join(flowDirectory, name), "utf8");
      expect(source).toMatch(
        /- scrollUntilVisible:\n\s+element:\n\s+id: starter-confirm\n\s+direction: DOWN\n\s+timeout: \d+\n- tapOn:\n\s+id: starter-confirm/,
      );
    }
  });
});
