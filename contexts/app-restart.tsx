import { createContext, useContext } from "react";

/** Starts the whole app again from storage, as on the first day (after deleting all data). */
export const AppRestartContext = createContext<() => void>(() => undefined);

export function useAppRestart(): () => void {
  return useContext(AppRestartContext);
}
