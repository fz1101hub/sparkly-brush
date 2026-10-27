import type { RefObject } from "react";
import type { View } from "react-native";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { captureRef } from "react-native-view-shot";

/** The postcard for the grandparents (voce 33), drawn on the phone and shared as an image. */
export const canSharePostcard = true;

export async function sharePostcard(view: RefObject<View | null>, dialogTitle: string): Promise<void> {
  const uri = await captureRef(view, { format: "png", quality: 1, result: "tmpfile" });
  let handed = false;
  try {
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle });
    handed = true;
  } finally {
    // After a share the image stays until the system clears its temporary files.
    const file = new File(uri);
    if (!handed && file.exists) file.delete();
  }
}
