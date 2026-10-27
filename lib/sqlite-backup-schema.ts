export type SQLiteSchemaObject = {
  type: string;
  name: string;
  tableName: string;
};

export type SQLiteTableColumn = {
  name: string;
  type: string;
  pk: number;
};

const REQUIRED_TABLES = new Set([
  "sessions",
  "metadata",
  "backup_manifest",
]);

const OPTIONAL_TABLES = new Set([
  "reward_ledger",
]);

const ALLOWED_INDEXES = new Map([
  ["sessions_started_at_idx", "sessions"],
  ["reward_ledger_session_idx", "reward_ledger"],
]);

const REQUIRED_COLUMNS = new Map<string, Map<string, string>>([
  ["sessions", new Map([
    ["id", "TEXT"],
    ["started_at", "INTEGER"],
    ["duration_seconds", "INTEGER"],
    ["target_seconds", "INTEGER"],
    ["completed", "INTEGER"],
    ["source", "TEXT"],
    ["device_session_id", "INTEGER"],
  ])],
  ["metadata", new Map([["key", "TEXT"], ["value", "TEXT"]])],
  ["backup_manifest", new Map([["id", "INTEGER"], ["value", "TEXT"]])],
  ["reward_ledger", new Map([
    ["id", "TEXT"],
    ["session_id", "TEXT"],
    ["kind", "TEXT"],
    ["coins", "INTEGER"],
    ["xp", "INTEGER"],
    ["details_json", "TEXT"],
    ["created_at", "INTEGER"],
  ])],
]);

const OPTIONAL_COLUMNS = new Map<string, Map<string, string>>([
  ["sessions", new Map([["time_confidence", "TEXT"], ["reward_policy", "TEXT"]])],
]);

const PRIMARY_KEY_COLUMNS = new Map([
  ["sessions", "id"],
  ["metadata", "key"],
  ["backup_manifest", "id"],
  ["reward_ledger", "id"],
]);

export function validateSQLiteBackupSchema(objects: SQLiteSchemaObject[]): void {
  const tables = new Set<string>();

  for (const object of objects) {
    if (object.type === "index" && object.name.startsWith("sqlite_autoindex_")) continue;
    if (object.name.startsWith("sqlite_")) {
      throw new Error(`Il backup contiene un oggetto SQLite interno non consentito: ${object.name}`);
    }
    if (object.type === "trigger" || object.type === "view") {
      throw new Error("Il backup contiene trigger o viste SQLite non consentiti");
    }
    if (object.type === "table") {
      if (!REQUIRED_TABLES.has(object.name) && !OPTIONAL_TABLES.has(object.name)) {
        throw new Error(`Il backup contiene una tabella SQLite non consentita: ${object.name}`);
      }
      if (object.tableName !== object.name) {
        throw new Error(`La tabella SQLite ${object.name} non è valida`);
      }
      tables.add(object.name);
      continue;
    }
    if (object.type === "index") {
      const expectedTable = ALLOWED_INDEXES.get(object.name);
      if (!expectedTable || expectedTable !== object.tableName) {
        throw new Error(`Il backup contiene un indice SQLite non consentito: ${object.name}`);
      }
      continue;
    }
    throw new Error(`Il backup contiene un oggetto SQLite non consentito: ${object.name}`);
  }

  for (const required of REQUIRED_TABLES) {
    if (!tables.has(required)) {
      throw new Error(`Il backup non contiene la tabella SQLite richiesta: ${required}`);
    }
  }
}

export function validateSQLiteBackupTableColumns(
  tableName: string,
  columns: SQLiteTableColumn[],
): void {
  const required = REQUIRED_COLUMNS.get(tableName);
  if (!required) throw new Error(`Il backup contiene una tabella SQLite non consentita: ${tableName}`);
  const optional = OPTIONAL_COLUMNS.get(tableName) ?? new Map<string, string>();
  const primaryKeyColumn = PRIMARY_KEY_COLUMNS.get(tableName);
  const seen = new Set<string>();
  for (const column of columns) {
    const expectedType = required.get(column.name) ?? optional.get(column.name);
    if (!expectedType || column.type.toUpperCase() !== expectedType) {
      throw new Error(`La tabella SQLite ${tableName} contiene una colonna non consentita: ${column.name}`);
    }
    if (seen.has(column.name)) {
      throw new Error(`La tabella SQLite ${tableName} contiene una colonna duplicata: ${column.name}`);
    }
    const expectedPrimaryKeyPosition = column.name === primaryKeyColumn ? 1 : 0;
    if (column.pk !== expectedPrimaryKeyPosition) {
      throw new Error(`La tabella SQLite ${tableName} contiene una chiave primaria non valida`);
    }
    seen.add(column.name);
  }
  for (const name of required.keys()) {
    if (!seen.has(name)) {
      throw new Error(`La tabella SQLite ${tableName} non contiene la colonna richiesta: ${name}`);
    }
  }
}
