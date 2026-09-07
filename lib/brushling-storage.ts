import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_BRUSHLING_ID, isBrushlingId, type BrushlingId } from "@/lib/brushlings";

const SELECTED_BRUSHLING_KEY = "sparkly-brush.brushling.selected.v1";

export async function loadSelectedBrushling(): Promise<BrushlingId> {
  try {
    const stored = await AsyncStorage.getItem(SELECTED_BRUSHLING_KEY);
    return stored && isBrushlingId(stored) ? stored : DEFAULT_BRUSHLING_ID;
  } catch {
    return DEFAULT_BRUSHLING_ID;
  }
}

export async function saveSelectedBrushling(id: BrushlingId): Promise<void> {
  await AsyncStorage.setItem(SELECTED_BRUSHLING_KEY, id);
}
