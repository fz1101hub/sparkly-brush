import { describe, expect, it } from "vitest";

import {
  validateSQLiteBackupSchema,
  validateSQLiteBackupTableColumns,
} from "@/lib/sqlite-backup-schema";

const validSchema = [
  { type: "table", name: "sessions", tableName: "sessions" },
  { type: "table", name: "metadata", tableName: "metadata" },
  { type: "table", name: "backup_manifest", tableName: "backup_manifest" },
  { type: "table", name: "reward_ledger", tableName: "reward_ledger" },
  { type: "index", name: "sessions_started_at_idx", tableName: "sessions" },
  { type: "index", name: "reward_ledger_session_idx", tableName: "reward_ledger" },
  { type: "index", name: "sqlite_autoindex_sessions_1", tableName: "sessions" },
];

describe("SQLite backup schema", () => {
  it("accetta soltanto lo schema portatile previsto", () => {
    expect(() => validateSQLiteBackupSchema(validSchema)).not.toThrow();
  });

  it.each([
    { type: "trigger", name: "attacker_trigger", tableName: "sessions" },
    { type: "view", name: "attacker_view", tableName: "attacker_view" },
    { type: "view", name: "sessions", tableName: "sessions" },
    { type: "table", name: "attacker_table", tableName: "attacker_table" },
    { type: "index", name: "attacker_index", tableName: "sessions" },
    { type: "trigger", name: "sqlite_evil", tableName: "sessions" },
  ])("rifiuta l'oggetto non consentito $type:$name", (object) => {
    expect(() => validateSQLiteBackupSchema([...validSchema, object])).toThrow("non consentit");
  });

  it("rifiuta una tabella richiesta sostituita da una view", () => {
    expect(() => validateSQLiteBackupSchema([
      ...validSchema.filter((object) => object.name !== "sessions" && object.name !== "sessions_started_at_idx"),
      { type: "view", name: "sessions", tableName: "sessions" },
    ])).toThrow("viste SQLite");
  });

  it("accetta le colonne sessioni legacy e correnti, ma nessuna colonna extra", () => {
    const legacy = [
      ["id", "TEXT"],
      ["started_at", "INTEGER"],
      ["duration_seconds", "INTEGER"],
      ["target_seconds", "INTEGER"],
      ["completed", "INTEGER"],
      ["source", "TEXT"],
      ["device_session_id", "INTEGER"],
    ].map(([name, type]) => ({ name, type, pk: name === "id" ? 1 : 0 }));
    expect(() => validateSQLiteBackupTableColumns("sessions", legacy)).not.toThrow();
    expect(() => validateSQLiteBackupTableColumns("sessions", [
      ...legacy,
      { name: "time_confidence", type: "TEXT", pk: 0 },
      { name: "reward_policy", type: "TEXT", pk: 0 },
    ])).not.toThrow();
    expect(() => validateSQLiteBackupTableColumns("sessions", [
      ...legacy,
      { name: "poison", type: "TEXT", pk: 0 },
    ])).toThrow("colonna non consentita");
  });

  it("rifiuta colonne richieste mancanti o con affinità alterata", () => {
    expect(() => validateSQLiteBackupTableColumns("metadata", [
      { name: "key", type: "TEXT", pk: 1 },
    ])).toThrow("colonna richiesta");
    expect(() => validateSQLiteBackupTableColumns("backup_manifest", [
      { name: "id", type: "TEXT", pk: 1 },
      { name: "value", type: "TEXT", pk: 0 },
    ])).toThrow("colonna non consentita");
  });

  it("rifiuta una tabella sessioni senza chiave primaria sull'id", () => {
    const columns = [
      ["id", "TEXT"],
      ["started_at", "INTEGER"],
      ["duration_seconds", "INTEGER"],
      ["target_seconds", "INTEGER"],
      ["completed", "INTEGER"],
      ["source", "TEXT"],
      ["device_session_id", "INTEGER"],
    ].map(([name, type]) => ({ name, type, pk: 0 }));
    expect(() => validateSQLiteBackupTableColumns("sessions", columns)).toThrow("chiave primaria");
  });
});
