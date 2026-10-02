/**
 * Synthetic, non-user backup for the Android document-picker regression.
 * Generate with: SPARKLY_FIXTURE_OUT=artifacts/fixtures/sparkly-ci-archive.sqlite pnpm exec vitest run tests/native-backup-fixture.test.ts
 * The file is intentionally generated (never committed or uploaded).
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { validateBackupSemanticState } from "@/lib/backup-integrity";
import type { BrushSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createEmptyLifetimeProgress,
} from "@/lib/lifetime-progress";
import { createRewardLedgerEntries } from "@/lib/reward-ledger";
import {
  validateSQLiteBackupSchema,
  validateSQLiteBackupTableColumns,
} from "@/lib/sqlite-backup-schema";

export const FIXTURE_SESSION_COUNT = 125;
const CREATED_AT = Date.UTC(2026, 9, 1, 10);

export function writeNativeBackupFixture(output: string): void {
  if (!output.endsWith(".sqlite"))
    throw new Error("La fixture deve usare l'estensione .sqlite");
  mkdirSync(dirname(output), { recursive: true });
  const db = new DatabaseSync(output);
  let committed = false;
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY NOT NULL,
        started_at INTEGER NOT NULL,
        time_confidence TEXT NOT NULL DEFAULT 'exact' CHECK (time_confidence IN ('exact', 'reconstructed', 'approximate')),
        reward_policy TEXT NOT NULL DEFAULT 'legacy' CHECK (reward_policy IN ('legacy', 'completed-only')),
        duration_seconds INTEGER NOT NULL,
        target_seconds INTEGER NOT NULL,
        completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
        source TEXT NOT NULL CHECK (source IN ('manual', 'device')),
        device_session_id INTEGER
      );
      CREATE INDEX sessions_started_at_idx ON sessions(started_at DESC, id DESC);
      CREATE TABLE metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
      CREATE TABLE reward_ledger (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('session', 'daily-missions', 'achievements')),
        coins INTEGER NOT NULL,
        xp INTEGER NOT NULL,
        details_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX reward_ledger_session_idx ON reward_ledger(session_id, created_at ASC);
      CREATE TABLE backup_manifest (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL);
    `);
    const insertSession = db.prepare(`INSERT INTO sessions
      (id, started_at, time_confidence, reward_policy, duration_seconds, target_seconds, completed, source, device_session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertLedger = db.prepare(`INSERT INTO reward_ledger
      (id, session_id, kind, coins, xp, details_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const insertMeta = db.prepare(
      "INSERT INTO metadata (key, value) VALUES (?, ?)",
    );
    const sessions: BrushSession[] = [];
    const ledger: ReturnType<typeof createRewardLedgerEntries> = [];
    let progress = createEmptyLifetimeProgress();
    db.exec("BEGIN IMMEDIATE");
    for (let index = 0; index < FIXTURE_SESSION_COUNT; index += 1) {
      // Approximate dates keep timezone-dependent daily achievements out of the fixture.
      const session: BrushSession = {
        id: `ci-archive-${String(index + 1).padStart(3, "0")}`,
        startedAt: Date.UTC(2013, 0, 1) + index * 30 * 86_400_000,
        timeConfidence: "approximate",
        rewardPolicy: "completed-only",
        durationSeconds: 120,
        targetSeconds: 120,
        completed: true,
        source: "manual",
      };
      const before = progress;
      progress = applySessionToLifetime(before, session);
      sessions.push(session);
      insertSession.run(
        session.id,
        session.startedAt,
        session.timeConfidence ?? "exact",
        session.rewardPolicy ?? "legacy",
        session.durationSeconds,
        session.targetSeconds,
        1,
        "manual",
        null,
      );
      for (const reward of createRewardLedgerEntries({
        session,
        before,
        after: progress,
      })) {
        ledger.push(reward);
        insertLedger.run(
          reward.id,
          reward.sessionId,
          reward.kind,
          reward.coins,
          reward.xp,
          JSON.stringify(reward.details),
          reward.createdAt,
        );
      }
    }
    validateBackupSemanticState({
      sessions,
      progress,
      historyComplete: true,
      ledger,
    });
    const manifest = {
      format: "brushlings-backup",
      version: 3,
      createdAt: CREATED_AT,
      historyComplete: true,
      archivedSessionCount: FIXTURE_SESSION_COUNT,
      profile: { selectedId: "bloopi", hasChosenStarter: true },
      customization: {
        ownedIds: ["bubble-room"],
        purchaseLedger: [],
        equippedHabitatId: "bubble-room",
        equippedAccessoryId: null,
        equippedDecorId: null,
      },
      preferences: {
        onboardingCompleted: true,
        soundsEnabled: true,
        musicEnabled: false,
        hapticsEnabled: true,
        language: "it",
      },
      parentRewards: [],
      lifetimeProgress: progress,
    };
    insertMeta.run("lifetime-progress", JSON.stringify(progress));
    insertMeta.run("history-complete", "true");
    insertMeta.run("reward-ledger-backfilled-v1", "true");
    db.prepare("INSERT INTO backup_manifest (id, value) VALUES (1, ?)").run(
      JSON.stringify(manifest),
    );
    db.exec("COMMIT");
    committed = true;

    const schema = db
      .prepare(
        "SELECT type, name, tbl_name AS table_name FROM sqlite_schema ORDER BY type ASC, name ASC",
      )
      .all() as { type: string; name: string; table_name: string }[];
    validateSQLiteBackupSchema(
      schema.map((item) => ({
        type: item.type,
        name: item.name,
        tableName: item.table_name,
      })),
    );
    for (const item of schema.filter((object) => object.type === "table")) {
      const columns = db.prepare(`PRAGMA table_info(${item.name})`).all() as {
        name: string;
        type: string;
        pk: number;
      }[];
      validateSQLiteBackupTableColumns(item.name, columns);
    }
    if (db.prepare("PRAGMA integrity_check").get()?.integrity_check !== "ok")
      throw new Error("SQLite integrity_check non superato");
    if (
      db.prepare("SELECT COUNT(*) AS count FROM sessions").get()?.count !==
      FIXTURE_SESSION_COUNT
    )
      throw new Error("Numero sessioni fixture non corretto");
  } catch (error) {
    if (!committed) db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}
