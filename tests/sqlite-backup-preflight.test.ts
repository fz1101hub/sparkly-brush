import { describe, expect, it } from "vitest";

import { validateSQLiteBackupHeader } from "@/lib/sqlite-backup-preflight";

const SQLITE_SIGNATURE = new TextEncoder().encode("SQLite format 3\0");

function validHeader(pageSize = 4_096): Uint8Array {
  const header = new Uint8Array(100);
  header.set(SQLITE_SIGNATURE);
  const encodedPageSize = pageSize === 65_536 ? 1 : pageSize;
  header[16] = (encodedPageSize >>> 8) & 0xff;
  header[17] = encodedPageSize & 0xff;
  header[18] = 1;
  header[19] = 1;
  header[20] = 0;
  header[21] = 64;
  header[22] = 32;
  header[23] = 32;
  header[47] = 4;
  header[59] = 1;
  return header;
}

describe("SQLite backup preflight", () => {
  it("accetta header SQLite coerenti senza imporre un limite alla dimensione", () => {
    expect(validateSQLiteBackupHeader(validHeader(), 4_096)).toEqual({ pageSize: 4_096 });
    expect(validateSQLiteBackupHeader(validHeader(65_536), 65_536 * 1_000_000)).toEqual({
      pageSize: 65_536,
    });
  });

  it("rifiuta un file di testo rinominato prima del parser SQLite", () => {
    const html = new Uint8Array(100);
    html.set(new TextEncoder().encode("<!doctype html><html>not a backup</html>"));
    expect(() => validateSQLiteBackupHeader(html, 4_096)).toThrow(/SQLite valido/);
  });

  it("rifiuta header troncati, page size incoerenti e schema non supportato", () => {
    expect(() => validateSQLiteBackupHeader(new Uint8Array(99), 99)).toThrow(/troppo piccolo/);

    const invalidPageSize = validHeader();
    invalidPageSize[16] = 0x03;
    invalidPageSize[17] = 0xe8;
    expect(() => validateSQLiteBackupHeader(invalidPageSize, 4_096)).toThrow(/pagina SQLite/);

    const invalidSchema = validHeader();
    invalidSchema[47] = 5;
    expect(() => validateSQLiteBackupHeader(invalidSchema, 4_096)).toThrow(/Schema SQLite/);
  });
});
