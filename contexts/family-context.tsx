import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import {
  getPreferencesStorage,
  DEFAULT_APP_PREFERENCES,
} from "@/lib/preferences";
import {
  loadFamilyProfiles,
  saveFamilyProfiles,
  validateProfileName,
  MAX_FAMILY_PROFILES,
  type ChildProfile,
  type FamilyProfiles,
} from "@/lib/family-profiles";
import { setActiveProfileId } from "@/lib/profile-scope";
import { isRestoreOperationActive } from "@/lib/history-operation";

type FamilyContextValue = {
  active: ChildProfile;
  profiles: ChildProfile[];
  busy: boolean;
  homeRequested: boolean;
  acknowledgeNavigation: () => void;
  switchProfile: (id: string) => Promise<void>;
  addProfile: (name: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  registerGuard: (guard: () => Promise<void>) => () => void;
};
const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<FamilyProfiles | null>(null);
  const [busy, setBusy] = useState(false);
  const [homeRequested, setHomeRequested] = useState(false);
  const acknowledgeNavigation = useCallback(() => setHomeRequested(false), []);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<FamilyProfiles | null>(null);
  const locked = useRef(false);
  const guards = useRef(new Set<() => Promise<void>>());

  const load = useCallback(async () => {
    setError(null);
    try {
      const value = await loadFamilyProfiles();
      setActiveProfileId(value.activeId);
      current.current = value;
      setFamily(value);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Profili non disponibili",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const registerGuard = useCallback((guard: () => Promise<void>) => {
    guards.current.add(guard);
    return () => {
      guards.current.delete(guard);
    };
  }, []);

  const change = useCallback(
    async (
      transform: (previous: FamilyProfiles) => Promise<FamilyProfiles>,
      transition: boolean,
    ) => {
      if (locked.current || !current.current)
        throw new Error("Attendi il salvataggio del profilo");
      if (isRestoreOperationActive())
        throw new Error("Attendi la fine del ripristino");
      locked.current = true;
      setBusy(true);
      try {
        if (transition) for (const guard of guards.current) await guard();
        const next = await transform(current.current);
        await saveFamilyProfiles(next);
        if (transition && next.activeId !== current.current.activeId)
          setHomeRequested(true);
        setActiveProfileId(next.activeId);
        current.current = next;
        setFamily(next);
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [],
  );

  const switchProfile = useCallback(
    (id: string) =>
      change(async (previous) => {
        if (!previous.profiles.some((p) => p.id === id))
          throw new Error("Profilo non disponibile");
        return { ...previous, activeId: id };
      }, true),
    [change],
  );

  const addProfile = useCallback(
    (name: string) =>
      change(async (previous) => {
        if (previous.profiles.length >= MAX_FAMILY_PROFILES)
          throw new Error("Puoi creare fino a otto profili");
        const clean = validateProfileName(name, previous.profiles);
        const id = `child-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        await getPreferencesStorage(id).saveAppPreferences({
          ...DEFAULT_APP_PREFERENCES,
          onboardingCompleted: true,
        });
        return {
          ...previous,
          activeId: id,
          profiles: [
            ...previous.profiles,
            { id, name: clean, createdAt: Date.now() },
          ],
        };
      }, true),
    [change],
  );

  const renameProfile = useCallback(
    (id: string, name: string) =>
      change(async (previous) => {
        if (!previous.profiles.some((p) => p.id === id))
          throw new Error("Profilo non disponibile");
        const clean = validateProfileName(name, previous.profiles, id);
        return {
          ...previous,
          profiles: previous.profiles.map((p) =>
            p.id === id ? { ...p, name: clean } : p,
          ),
        };
      }, false),
    [change],
  );

  if (!family)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          gap: 16,
        }}
      >
        {error ? (
          <>
            <Text accessibilityRole="alert">{error}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void load()}
              style={{ padding: 16 }}
            >
              <Text>Riprova a caricare i profili</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator accessibilityLabel="Carico i profili" />
        )}
      </View>
    );
  const active = family.profiles.find((p) => p.id === family.activeId)!;
  return (
    <FamilyContext.Provider
      value={{
        active,
        profiles: family.profiles,
        busy,
        homeRequested,
        acknowledgeNavigation,
        switchProfile,
        addProfile,
        renameProfile,
        registerGuard,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useOptionalFamily() {
  return useContext(FamilyContext);
}
export function useFamily() {
  const value = useOptionalFamily();
  if (!value) throw new Error("FamilyProvider non disponibile");
  return value;
}
