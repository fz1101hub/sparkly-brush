import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  getBrushStorage,
  inspectCompleteBackupDatabase,
  type HistoryBundle,
} from "./brush-storage.native";
import {
  backupFingerprint,
  parseBackupManifest,
  type BrushlingsBackupManifest,
} from "./backup";
import {
  SQLITE_BACKUP_HEADER_BYTES,
  validateSQLiteBackupHeader,
} from "./sqlite-backup-preflight";

export type CompleteBackupPreview = {
  uri: string;
  manifest: BrushlingsBackupManifest;
  sessionCount: number;
  size: number;
};

function fileName(manifest: BrushlingsBackupManifest): string {
  return `sparkly-brush-${backupFingerprint(manifest)}.brushlings`;
}

export async function exportAndShareCompleteBackup(
  manifest: BrushlingsBackupManifest,
  profileId?: string,
): Promise<{ sessionCount: number; size: number }> {
  const file = await getBrushStorage(profileId).createCompleteBackupDatabase(JSON.stringify(manifest), fileName(manifest));
  try {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("La condivisione file non è disponibile su questo dispositivo");
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Salva il backup completo di Sparkly Brush",
      mimeType: "application/vnd.sqlite3",
      UTI: "public.database",
    });
    return { sessionCount: file.sessionCount, size: file.size };
  } finally {
    const temporary = new File(file.uri);
    if (temporary.exists) temporary.delete();
  }
}

export async function pickAndInspectCompleteBackup(): Promise<CompleteBackupPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/vnd.sqlite3", "application/x-sqlite3", "application/octet-stream"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const pickedFile = new File(result.assets[0].uri);
  try {
    const handle = pickedFile.open();
    try {
      validateSQLiteBackupHeader(handle.readBytes(SQLITE_BACKUP_HEADER_BYTES), pickedFile.size);
    } finally {
      handle.close();
    }
    const inspection = await inspectCompleteBackupDatabase(pickedFile.uri);
    const manifest = parseBackupManifest(inspection.manifestJson);
    if (inspection.sessionCount !== manifest.archivedSessionCount) {
      throw new Error("Il backup non contiene tutte le sessioni dichiarate");
    }
    return { ...inspection, manifest };
  } finally {
    if (pickedFile.exists) pickedFile.delete();
  }
}

export async function restoreCompleteBackup(
  preview: CompleteBackupPreview,
  restoreId: string,
  profileId?: string,
): Promise<HistoryBundle> {
  return getBrushStorage(profileId).restoreCompleteBackupDatabase(preview.uri, restoreId);
}

export function discardCompleteBackupPreview(preview: CompleteBackupPreview): void {
  const temporary = new File(preview.uri);
  if (temporary.exists) temporary.delete();
}

