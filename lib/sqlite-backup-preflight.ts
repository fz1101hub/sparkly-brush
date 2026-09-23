const SQLITE_HEADER_BYTES = 100;
const SQLITE_SIGNATURE = [
  0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66,
  0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00,
] as const;

function unsigned16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] * 256 + bytes[offset + 1];
}

function unsigned32(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] * 0x1000000
    + bytes[offset + 1] * 0x10000
    + bytes[offset + 2] * 0x100
    + bytes[offset + 3]
  );
}

function validPowerOfTwoPageSize(pageSize: number): boolean {
  return pageSize >= 512 && pageSize <= 65_536 && (pageSize & (pageSize - 1)) === 0;
}

/**
 * Performs a bounded, allocation-free validation of the SQLite database header.
 * It intentionally does not impose an application-level maximum backup size.
 */
export function validateSQLiteBackupHeader(
  header: Uint8Array,
  fileSize: number,
): { pageSize: number } {
  if (!Number.isSafeInteger(fileSize) || fileSize < SQLITE_HEADER_BYTES) {
    throw new Error("Il file selezionato è troppo piccolo per essere un backup Sparkly Brush");
  }
  if (header.length < SQLITE_HEADER_BYTES) {
    throw new Error("Header del backup incompleto");
  }
  if (!SQLITE_SIGNATURE.every((byte, index) => header[index] === byte)) {
    throw new Error("Il file selezionato non è un database SQLite valido");
  }

  const encodedPageSize = unsigned16(header, 16);
  const pageSize = encodedPageSize === 1 ? 65_536 : encodedPageSize;
  if (!validPowerOfTwoPageSize(pageSize) || fileSize % pageSize !== 0) {
    throw new Error("Dimensione pagina SQLite non valida");
  }
  if (![1, 2].includes(header[18]) || ![1, 2].includes(header[19])) {
    throw new Error("Versione del formato SQLite non supportata");
  }
  if (header[20] > pageSize - 480 || header[21] !== 64 || header[22] !== 32 || header[23] !== 32) {
    throw new Error("Header SQLite incoerente");
  }

  const schemaFormat = unsigned32(header, 44);
  const textEncoding = unsigned32(header, 56);
  if (schemaFormat < 1 || schemaFormat > 4 || textEncoding < 1 || textEncoding > 3) {
    throw new Error("Schema SQLite non supportato");
  }
  return { pageSize };
}

export const SQLITE_BACKUP_HEADER_BYTES = SQLITE_HEADER_BYTES;
