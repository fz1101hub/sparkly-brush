import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, Platform, StyleSheet, View } from "react-native";

import { ParentChallengeCard } from "@/components/parent-challenge-card";
import { useI18n } from "@/contexts/locale-context";
import { usePreferences } from "@/contexts/preferences-context";
import { PARENT_GATE_UNLOCK_MS } from "@/lib/parent-gate";
import { DEFAULT_PARENT_LOCK, loadParentLock, saveParentLock, type ParentLock } from "@/lib/parent-lock";

type ParentGateContextValue = {
  /** Whether the family turned the gate on in Settings. */
  enabled: boolean;
  /** True while a recently solved challenge keeps the parent areas open. */
  isUnlocked: () => boolean;
  /** Runs the action now, or after the parent solves the challenge. */
  requireParent: (action: () => void) => void;
  /** Records a challenge solved inline (by a guarded screen). */
  unlock: () => void;
  /** The parents' PIN and biometrics (voce 65); null while it is read at start. */
  lock: ParentLock | null;
  saveLock: (lock: ParentLock) => Promise<void>;
};

const ParentGateContext = createContext<ParentGateContextValue | null>(null);

export function ParentGateProvider({ children }: PropsWithChildren) {
  const { preferences } = usePreferences();
  const { t } = useI18n();
  const enabled = preferences.parentGateEnabled;
  const unlockedUntilRef = useRef(0);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [lock, setLock] = useState<ParentLock | null>(null);

  useEffect(() => {
    let active = true;
    void loadParentLock().then((loaded) => {
      if (active) setLock(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const saveLock = useCallback(async (next: ParentLock) => {
    await saveParentLock(next);
    setLock(await loadParentLock());
  }, []);

  const isUnlocked = useCallback(() => Date.now() < unlockedUntilRef.current, []);
  const unlock = useCallback(() => {
    unlockedUntilRef.current = Date.now() + PARENT_GATE_UNLOCK_MS;
  }, []);
  const requireParent = useCallback(
    (action: () => void) => {
      if (!enabled || isUnlocked()) {
        action();
        return;
      }
      setPending(() => action);
    },
    [enabled, isUnlocked],
  );

  const value = useMemo<ParentGateContextValue>(
    () => ({ enabled, isUnlocked, requireParent, unlock, lock, saveLock }),
    [enabled, isUnlocked, requireParent, unlock, lock, saveLock],
  );

  return (
    <ParentGateContext.Provider value={value}>
      {children}
      {pending ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPending(null)} statusBarTranslucent>
          <View
            testID="parent-gate-modal"
            role="dialog"
            accessibilityViewIsModal={Platform.OS !== "web"}
            accessibilityLabel={t("parentGate.title")}
            style={styles.backdrop}
          >
            <ParentChallengeCard
              lock={lock}
              onCancel={() => setPending(null)}
              onSolved={() => {
                unlock();
                const action = pending;
                setPending(null);
                action();
              }}
            />
          </View>
        </Modal>
      ) : null}
    </ParentGateContext.Provider>
  );
}

const FALLBACK: ParentGateContextValue = {
  enabled: false,
  isUnlocked: () => true,
  requireParent: (action) => action(),
  unlock: () => undefined,
  lock: DEFAULT_PARENT_LOCK,
  saveLock: async () => undefined,
};

/** Screens rendered without the provider (isolated tests) behave as if the gate were off. */
export function useParentGate(): ParentGateContextValue {
  return useContext(ParentGateContext) ?? FALLBACK;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 22, 42, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
