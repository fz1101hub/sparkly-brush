import type { BrushlingsBackupManifest } from "./backup";
import type { HistoryBundle } from "./brush-storage";
import type { TranslationKey } from "./i18n";

export type CompleteBackupPreview = {
  uri: string;
  manifest: BrushlingsBackupManifest;
  sessionCount: number;
  size: number;
};

const unavailable = "Il backup completo su file è disponibile nell’app iOS e Android";

export async function exportAndShareCompleteBackup(
  _manifest: BrushlingsBackupManifest,
  _t?: (key: TranslationKey) => string,
): Promise<{ sessionCount: number; size: number }> {
  throw new Error(unavailable);
}

export async function pickAndInspectCompleteBackup(): Promise<CompleteBackupPreview | null> {
  throw new Error(unavailable);
}

export async function restoreCompleteBackup(
  _preview: CompleteBackupPreview,
  _restoreId: string,
): Promise<HistoryBundle> {
  throw new Error(unavailable);
}

export function discardCompleteBackupPreview(_preview: CompleteBackupPreview): void {
  // No temporary native file exists on web.
}
