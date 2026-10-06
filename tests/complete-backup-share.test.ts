import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleted: vi.fn(),
  available: vi.fn(),
  shared: vi.fn(),
  createBackup: vi.fn(),
}));

vi.mock("expo-file-system", () => ({
  File: class MockFile {
    uri: string;
    exists = true;
    constructor(uri: string) { this.uri = uri; }
    delete() { mocks.deleted(this.uri); this.exists = false; }
  },
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: mocks.available,
  shareAsync: mocks.shared,
}));
vi.mock("expo-document-picker", () => ({ getDocumentAsync: vi.fn() }));
vi.mock("@/lib/brush-storage.native", () => ({
  createCompleteBackupDatabase: mocks.createBackup,
  inspectCompleteBackupDatabase: vi.fn(),
  restoreCompleteBackupDatabase: vi.fn(),
}));

import { exportAndShareCompleteBackup } from "@/lib/complete-backup.native";
import { createBackupManifest } from "@/lib/backup";
import { createEmptyLifetimeProgress } from "@/lib/lifetime-progress";

const manifest = createBackupManifest(
  { selectedId: "bloopi", hasChosenStarter: false },
  {
    ownedIds: ["bubble-room"],
    purchaseLedger: [],
    equippedHabitatId: "bubble-room",
    equippedAccessoryId: null,
    equippedDecorId: null,
  },
  createEmptyLifetimeProgress(),
);

describe("complete backup native sharing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.available.mockResolvedValue(true);
    mocks.shared.mockResolvedValue(undefined);
    mocks.createBackup.mockResolvedValue({
      uri: "file:///cache/sparkly.brushlings",
      sessionCount: 12,
      size: 4096,
    });
  });

  it("mantiene il file leggibile dopo l'handoff allo share sheet", async () => {
    await expect(exportAndShareCompleteBackup(manifest)).resolves.toEqual({
      sessionCount: 12,
      size: 4096,
    });
    expect(mocks.shared).toHaveBeenCalledWith(
      "file:///cache/sparkly.brushlings",
      expect.objectContaining({ mimeType: "application/vnd.sqlite3" }),
    );
    expect(mocks.deleted).not.toHaveBeenCalled();
  });

  it("cancella il file se non riesce a consegnarlo allo share sheet", async () => {
    mocks.available.mockResolvedValue(false);
    await expect(exportAndShareCompleteBackup(manifest)).rejects.toThrow("non è disponibile");
    expect(mocks.deleted).toHaveBeenCalledWith("file:///cache/sparkly.brushlings");
  });
});
