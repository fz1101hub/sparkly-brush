import { File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

/** Native: the system print dialog, or a PDF handed to the share sheet (mail, chat, files). */
export const canSharePdf = true;

export async function printHtml(html: string): Promise<void> {
  await Print.printAsync({ html });
}

/**
 * Shared files keep the SHARE_FILE_PREFIX: the receiving app may still be reading them after the
 * share sheet closes, so they are removed at the next start (initializeHistoryStorage), as backups are.
 */
export const SHARE_FILE_PREFIX = "sparkly-share-";

async function shareFile(file: File, mimeType: string, UTI: string, dialogTitle: string): Promise<void> {
  let handed = false;
  try {
    await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle });
    handed = true;
  } finally {
    if (!handed && file.exists) file.delete();
  }
}

export async function sharePdf(html: string, fileName: string, dialogTitle: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  const target = new File(Paths.cache, `${SHARE_FILE_PREFIX}${fileName}`);
  if (target.exists) target.delete();
  new File(uri).move(target);
  await shareFile(target, "application/pdf", "com.adobe.pdf", dialogTitle);
}

export async function shareTextFile(text: string, fileName: string, mimeType: string, dialogTitle: string): Promise<void> {
  const file = new File(Paths.cache, `${SHARE_FILE_PREFIX}${fileName}`);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  await shareFile(file, mimeType, "public.comma-separated-values-text", dialogTitle);
}
