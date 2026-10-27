import AsyncStorage from "@react-native-async-storage/async-storage";

import { getBrushStorage } from "@/lib/brush-storage";
import { cancelAllNotifications } from "@/lib/reminder-platform";

/**
 * «Cancellare tutti i dati della famiglia» (voce 70): the sessions of every child, every setting
 * and record kept on the phone and every scheduled reminder. The handle's sync cursors stay in
 * each history store (as with «Svuota storico»), so a toothbrush cannot import again the sessions
 * just deleted; backup files saved elsewhere are not touched.
 */
export async function wipeFamilyData(profileIds: readonly string[]): Promise<void> {
  for (const id of profileIds) {
    const storage = getBrushStorage(id);
    await storage.clearHistory();
    await storage.clearDemoHistory();
  }
  await cancelAllNotifications().catch(() => undefined);
  await AsyncStorage.clear();
}
