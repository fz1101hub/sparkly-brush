import { createContext, useContext } from "react";

import type { ChildProfile } from "@/lib/family-profiles";

/** Kept apart from the provider so storage contexts can read it without the provider's UI. */
export type FamilyContextValue = {
  active: ChildProfile;
  profiles: ChildProfile[];
  busy: boolean;
  homeRequested: boolean;
  acknowledgeNavigation: () => void;
  switchProfile: (id: string) => Promise<void>;
  addProfile: (name: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  /** Checks run before a profile switch; one that throws keeps the current profile. */
  registerGuard: (guard: () => Promise<void>) => () => void;
};

export const FamilyContext = createContext<FamilyContextValue | null>(null);

export function useOptionalFamily() {
  return useContext(FamilyContext);
}

export function useFamily() {
  const value = useOptionalFamily();
  if (!value) throw new Error("FamilyProvider non disponibile");
  return value;
}
