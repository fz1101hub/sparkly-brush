import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function exportHardwareValidationReport(
  fileName: string,
  content: string,
): Promise<void> {
  const file = new File(Paths.cache, fileName);
  let handedToShareSheet = false;
  try {
    file.create({ overwrite: true, intermediates: true });
    file.write(content);
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("La condivisione file non è disponibile su questo dispositivo");
    }
    await Sharing.shareAsync(file.uri, {
      dialogTitle: "Condividi il report di collaudo Sparkly Brush",
      mimeType: "text/markdown",
      UTI: "net.daringfireball.markdown",
    });
    handedToShareSheet = true;
  } finally {
    if (!handedToShareSheet && file.exists) file.delete();
  }
}
