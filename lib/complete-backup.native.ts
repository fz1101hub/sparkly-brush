import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  createCompleteBackupDatabase,
  inspectCompleteBackupDatabase,
  restoreCompleteBackupDatabase,
  type HistoryBundle,
} from "./brush-storage.native";
import {
  backupFingerprint,
  parseBackupManifest,
  type BrushlingsBackupManifest,
} from "./backup";
import {
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "./i18n";
import { DEFAULT_LOCALE } from "./locale-types";
import {
  SQLITE_BACKUP_HEADER_BYTES,
  validateSQLiteBackupHeader,
} from "./sqlite-backup-preflight";

type BackupTranslate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const defaultTranslate: BackupTranslate = (key, params) =>
  translateDynamic(DEFAULT_LOCALE, key, params);

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
  t: BackupTranslate = defaultTranslate,
): Promise<{ sessionCount: number; size: number }> {
  const file = await createCompleteBackupDatabase(JSON.stringify(manifest), fileName(manifest));
  let handedToShareSheet = false;
  try {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("La condivisione file non è disponibile su questo dispositivo");
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: t("backup.shareDialogTitle"),
      mimeType: "application/vnd.sqlite3",
      UTI: "public.database",
    });
    handedToShareSheet = true;
    return { sessionCount: file.sessionCount, size: file.size };
  } finally {
    const temporary = new File(file.uri);
    if (!handedToShareSheet && temporary.exists) temporary.delete();
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
): Promise<HistoryBundle> {
  return restoreCompleteBackupDatabase(preview.uri, restoreId);
}

export function discardCompleteBackupPreview(preview: CompleteBackupPreview): void {
  const temporary = new File(preview.uri);
  if (temporary.exists) temporary.delete();
}
