/** Local-only browser download; names never enter a URL on a server. */
export async function shareLocalText(name: string, text: string, mime: string): Promise<void> {
  if (typeof document === "undefined") throw new Error("File export unavailable");
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
