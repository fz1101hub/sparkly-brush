export async function exportHardwareValidationReport(
  fileName: string,
  content: string,
): Promise<void> {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Il download del report non è disponibile in questo ambiente");
  }
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
