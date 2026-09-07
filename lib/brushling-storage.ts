import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_BRUSHLING_ID, isBrushlingId, type BrushlingId } from "@/lib/brushlings";

const SELECTED_BRUSHLING_KEY = "sparkly-brush.brushling.selected.v1";
const STARTER_CHOSEN_KEY = "sparkly-brush.brushling.starter-chosen.v1";

export type BrushlingProfile = {
  selectedId: BrushlingId;
  hasChosenStarter: boolean;
};

export async function loadBrushlingProfile(): Promise<BrushlingProfile> {
  try {
    const [storedId, starterChosen] = await Promise.all([
      AsyncStorage.getItem(SELECTED_BRUSHLING_KEY),
      AsyncStorage.getItem(STARTER_CHOSEN_KEY),
    ]);

    return {
      selectedId: storedId && isBrushlingId(storedId) ? storedId : DEFAULT_BRUSHLING_ID,
      hasChosenStarter: starterChosen === "true",
    };
  } catch {
    return {
      selectedId: DEFAULT_BRUSHLING_ID,
      hasChosenStarter: false,
    };
  }
}

export async function saveSelectedBrushling(id: BrushlingId): Promise<void> {
  await AsyncStorage.setItem(SELECTED_BRUSHLING_KEY, id);
}

export async function saveStarterSelection(id: BrushlingId): Promise<void> {
  await AsyncStorage.multiSet([
    [SELECTED_BRUSHLING_KEY, id],
    [STARTER_CHOSEN_KEY, "true"],
  ]);
}
