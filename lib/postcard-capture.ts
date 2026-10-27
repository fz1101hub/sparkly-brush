import type { RefObject } from "react";
import type { View } from "react-native";

/** Web: no capture; the postcard is shown and can be saved with a screenshot. */
export const canSharePostcard = false;

export async function sharePostcard(_view: RefObject<View | null>, _dialogTitle: string): Promise<void> {
  throw new Error("La cartolina si condivide dall’app iOS e Android");
}
