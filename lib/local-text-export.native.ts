import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function shareLocalText(name: string, text: string, mime: string): Promise<void> {
  if (!/^[a-z0-9.-]+$/i.test(name)) throw new Error("Invalid export filename");
  if (!(await Sharing.isAvailableAsync())) throw new Error("File sharing unavailable");
  const file = new File(Paths.cache, `${Date.now()}-${name}`);
  try {
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: mime, UTI: "public.comma-separated-values-text" });
  } finally {
    if (file.exists) file.delete();
  }
}
