/**
 * Web: the sheet opens in a new tab, where the browser prints it or saves it as PDF. The
 * native version (print.native.ts) makes a PDF with expo-print and hands it to the share sheet.
 */
export const canSharePdf = false;

export async function printHtml(html: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const opened = globalThis.open?.(url, "_blank");
  if (!opened) throw new Error("La finestra di stampa è stata bloccata dal browser");
}

export async function sharePdf(html: string, _fileName: string, _dialogTitle: string): Promise<void> {
  await printHtml(html);
}

/** CSV for a spreadsheet: downloaded by the browser. */
export async function shareTextFile(text: string, fileName: string, mimeType: string, _dialogTitle: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
