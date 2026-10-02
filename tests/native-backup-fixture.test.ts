import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import {
  FIXTURE_SESSION_COUNT,
  writeNativeBackupFixture,
} from "@/scripts/generate-native-backup-fixture";

const temporary: string[] = [];

afterEach(() => {
  for (const directory of temporary.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("synthetic native SQLite backup fixture", () => {
  it("emits a synthetic archive to the CI path when explicitly requested", () => {
    const directory = mkdtempSync(join(tmpdir(), "sparkly-fixture-output-"));
    temporary.push(directory);
    const output =
      process.env.SPARKLY_FIXTURE_OUT ??
      join(directory, "sparkly-ci-archive.sqlite");
    writeNativeBackupFixture(output);
    const db = new DatabaseSync(output, { readOnly: true });
    try {
      expect(db.prepare("PRAGMA integrity_check").get()).toEqual({
        integrity_check: "ok",
      });
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM sessions").get(),
      ).toEqual({ count: FIXTURE_SESSION_COUNT });
    } finally {
      db.close();
    }
  });

  it("keeps all sessions in the archive although a recent-history query returns 120", () => {
    const directory = mkdtempSync(join(tmpdir(), "sparkly-native-fixture-"));
    temporary.push(directory);
    const filename = join(directory, "ci-archive.sqlite");
    writeNativeBackupFixture(filename);
    const db = new DatabaseSync(filename, { readOnly: true });
    try {
      expect(db.prepare("PRAGMA integrity_check").get()).toEqual({
        integrity_check: "ok",
      });
      expect(
        db.prepare("SELECT COUNT(*) AS count FROM sessions").get(),
      ).toEqual({ count: FIXTURE_SESSION_COUNT });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM (SELECT id FROM sessions ORDER BY started_at DESC, id DESC LIMIT 120)",
          )
          .get(),
      ).toEqual({ count: 120 });
      expect(
        db
          .prepare(
            "SELECT COUNT(*) AS count FROM reward_ledger WHERE kind = 'session'",
          )
          .get(),
      ).toEqual({ count: FIXTURE_SESSION_COUNT });
      const progress = JSON.parse(
        String(
          db
            .prepare(
              "SELECT value FROM metadata WHERE key = 'lifetime-progress'",
            )
            .get()?.value,
        ),
      ) as { attemptedSessions: number; completedSessions: number };
      const manifest = JSON.parse(
        String(
          db.prepare("SELECT value FROM backup_manifest WHERE id = 1").get()
            ?.value,
        ),
      ) as {
        archivedSessionCount: number;
        historyComplete: boolean;
        lifetimeProgress: unknown;
      };
      expect(progress).toMatchObject({
        attemptedSessions: FIXTURE_SESSION_COUNT,
        completedSessions: FIXTURE_SESSION_COUNT,
      });
      expect(manifest).toMatchObject({
        archivedSessionCount: FIXTURE_SESSION_COUNT,
        historyComplete: true,
      });
      expect(manifest.lifetimeProgress).toEqual(
        JSON.parse(
          String(
            db
              .prepare(
                "SELECT value FROM metadata WHERE key = 'lifetime-progress'",
              )
              .get()?.value,
          ),
        ),
      );
    } finally {
      db.close();
    }
  });

  it("rejects a non-SQLite output name before opening a file", () => {
    const directory = mkdtempSync(join(tmpdir(), "sparkly-native-fixture-"));
    temporary.push(directory);
    expect(() =>
      writeNativeBackupFixture(join(directory, "unsafe.json")),
    ).toThrow(".sqlite");
  });
});
