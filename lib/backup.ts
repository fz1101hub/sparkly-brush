import type { BrushSession } from "@/lib/brush-types";
import {
  DEFAULT_APP_PREFERENCES,
  type AppPreferences,
} from "@/lib/preferences";
import { isLanguagePreference } from "@/lib/locale-types";
import type { ParentReward } from "@/lib/parent-rewards";
import { isBrushlingId, type BrushlingId } from "@/lib/brushlings";
import {
  createLifetimeProgress,
  normalizeLifetimeProgress,
  type LifetimeProgress,
} from "@/lib/lifetime-progress";
import {
  DEFAULT_CUSTOMIZATION_STATE,
  isCustomizationItemId,
  normalizePurchaseLedger,
  type CustomizationItemId,
  type CustomizationState,
} from "@/lib/customization";

export const BACKUP_PREFIX = "BRUSHLINGS-BACKUP-2:";
const LEGACY_BACKUP_PREFIX = "BRUSHLINGS-BACKUP-1:";

export type PortableBrushlingProfile = {
  selectedId: BrushlingId;
  hasChosenStarter: boolean;
};

export type BrushlingsBackup = {
  format: "brushlings-backup";
  version: 2;
  createdAt: number;
  profile: PortableBrushlingProfile;
  customization: CustomizationState;
  preferences: AppPreferences;
  parentRewards: ParentReward[];
  history: BrushSession[];
  lifetimeProgress: LifetimeProgress;
};

export type BrushlingsBackupManifest = {
  format: "brushlings-backup";
  version: 3;
  createdAt: number;
  historyComplete: boolean;
  archivedSessionCount: number;
  profile: PortableBrushlingProfile;
  customization: CustomizationState;
  preferences: AppPreferences;
  parentRewards: ParentReward[];
  lifetimeProgress: LifetimeProgress;
};

function normalizeOwnedIds(value: unknown): CustomizationItemId[] {
  if (!Array.isArray(value)) return [...DEFAULT_CUSTOMIZATION_STATE.ownedIds];
  const ids = value.filter(
    (item): item is CustomizationItemId => typeof item === "string" && isCustomizationItemId(item),
  );
  if (!ids.includes("bubble-room")) ids.unshift("bubble-room");
  return [...new Set(ids)];
}

function normalizeEquipped(
  value: unknown,
  ownedIds: CustomizationItemId[],
): CustomizationItemId | null {
  return typeof value === "string" && isCustomizationItemId(value) && ownedIds.includes(value)
    ? value
    : null;
}

function normalizeHistory(value: unknown): BrushSession[] {
  if (!Array.isArray(value)) throw new Error("Storico backup non valido");
  const sessions = value.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error("Sessione backup non valida");
    const candidate = item as Partial<BrushSession>;
    if (
      typeof candidate.id !== "string"
      || typeof candidate.startedAt !== "number"
      || typeof candidate.durationSeconds !== "number"
      || typeof candidate.targetSeconds !== "number"
      || typeof candidate.completed !== "boolean"
      || (candidate.timeConfidence !== undefined
        && candidate.timeConfidence !== "exact"
        && candidate.timeConfidence !== "reconstructed"
        && candidate.timeConfidence !== "approximate")
      || (candidate.rewardPolicy !== undefined
        && candidate.rewardPolicy !== "legacy"
        && candidate.rewardPolicy !== "completed-only")
      || (candidate.source !== "manual" && candidate.source !== "device")
    ) {
      throw new Error("Sessione " + String(index + 1) + " non valida");
    }
    return {
      id: candidate.id,
      startedAt: candidate.startedAt,
      timeConfidence: candidate.timeConfidence ?? "exact",
      rewardPolicy: candidate.rewardPolicy ?? "legacy",
      durationSeconds: Math.max(0, candidate.durationSeconds),
      targetSeconds: Math.max(1, candidate.targetSeconds),
      completed: candidate.completed,
      source: candidate.source,
      deviceSessionId: typeof candidate.deviceSessionId === "number" ? candidate.deviceSessionId : undefined,
    };
  });
  const byId = new Map(sessions.map((session) => [session.id, session]));
  return [...byId.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, 120);
}

function normalizePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== "object") return DEFAULT_APP_PREFERENCES;
  const raw = value as Partial<AppPreferences>;
  return {
    onboardingCompleted: raw.onboardingCompleted === true,
    soundsEnabled: raw.soundsEnabled !== false,
    musicEnabled: raw.musicEnabled === true,
    hapticsEnabled: raw.hapticsEnabled !== false,
    language: isLanguagePreference(raw.language) ? raw.language : "system",
  };
}

function normalizeParentRewards(value: unknown): ParentReward[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ParentReward => {
    if (!item || typeof item !== "object") return false;
    const raw = item as Partial<ParentReward>;
    return typeof raw.id === "string"
      && typeof raw.title === "string"
      && (raw.requirement === "completed-sessions" || raw.requirement === "perfect-days" || raw.requirement === "streak")
      && typeof raw.target === "number"
      && raw.target >= 1
      && typeof raw.createdAt === "number"
      && (raw.deliveredAt === null || typeof raw.deliveredAt === "number");
  }).slice(0, 40);
}

export function createBackup(
  history: BrushSession[],
  profile: PortableBrushlingProfile,
  customization: CustomizationState,
  createdAt: number = Date.now(),
  extras?: {
    preferences?: AppPreferences;
    parentRewards?: ParentReward[];
    lifetimeProgress?: LifetimeProgress;
  },
): BrushlingsBackup {
  const realHistory = history.filter((session) => session.source !== "demo");
  const recentHistory = realHistory.slice(0, 120);
  return {
    format: "brushlings-backup",
    version: 2,
    createdAt,
    profile,
    customization,
    preferences: extras?.preferences ?? DEFAULT_APP_PREFERENCES,
    parentRewards: extras?.parentRewards ?? [],
    history: recentHistory,
    lifetimeProgress: extras?.lifetimeProgress ?? createLifetimeProgress(realHistory),
  };
}

export function serializeBackup(backup: BrushlingsBackup): string {
  return BACKUP_PREFIX + JSON.stringify(backup);
}

export function createBackupManifest(
  profile: PortableBrushlingProfile,
  customization: CustomizationState,
  lifetimeProgress: LifetimeProgress,
  createdAt: number = Date.now(),
  extras?: {
    preferences?: AppPreferences;
    parentRewards?: ParentReward[];
  },
): BrushlingsBackupManifest {
  return {
    format: "brushlings-backup",
    version: 3,
    createdAt,
    historyComplete: true,
    archivedSessionCount: lifetimeProgress.attemptedSessions,
    profile,
    customization,
    preferences: extras?.preferences ?? DEFAULT_APP_PREFERENCES,
    parentRewards: extras?.parentRewards ?? [],
    lifetimeProgress,
  };
}

export function parseBackupManifest(json: string): BrushlingsBackupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Manifest del backup danneggiato");
  }
  if (!parsed || typeof parsed !== "object") throw new Error("Manifest del backup non valido");
  const raw = parsed as Record<string, unknown>;
  if (raw.format !== "brushlings-backup" || raw.version !== 3) {
    throw new Error("Versione file backup non supportata");
  }

  const rawProfile = raw.profile as Record<string, unknown> | undefined;
  const selectedId = rawProfile?.selectedId;
  if (typeof selectedId !== "string" || !isBrushlingId(selectedId)) {
    throw new Error("Creatura selezionata non valida");
  }
  const rawCustomization = raw.customization as Partial<CustomizationState> | undefined;
  const ownedIds = normalizeOwnedIds(rawCustomization?.ownedIds);
  const lifetimeProgress = normalizeLifetimeProgress(raw.lifetimeProgress);
  if (!lifetimeProgress) throw new Error("Progressione lifetime non valida");

  return {
    format: "brushlings-backup",
    version: 3,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    historyComplete: raw.historyComplete !== false,
    archivedSessionCount: typeof raw.archivedSessionCount === "number"
      ? Math.max(0, Math.floor(raw.archivedSessionCount))
      : lifetimeProgress.attemptedSessions,
    profile: {
      selectedId,
      hasChosenStarter: rawProfile?.hasChosenStarter === true,
    },
    customization: {
      ownedIds,
      purchaseLedger: normalizePurchaseLedger(rawCustomization?.purchaseLedger, ownedIds),
      equippedHabitatId: normalizeEquipped(rawCustomization?.equippedHabitatId, ownedIds) ?? "bubble-room",
      equippedAccessoryId: normalizeEquipped(rawCustomization?.equippedAccessoryId, ownedIds),
      equippedDecorId: normalizeEquipped(rawCustomization?.equippedDecorId, ownedIds),
    },
    preferences: normalizePreferences(raw.preferences),
    parentRewards: normalizeParentRewards(raw.parentRewards),
    lifetimeProgress,
  };
}

export function parseBackup(code: string): BrushlingsBackup {
  const trimmed = code.trim();
  const prefix = trimmed.startsWith(BACKUP_PREFIX)
    ? BACKUP_PREFIX
    : trimmed.startsWith(LEGACY_BACKUP_PREFIX)
      ? LEGACY_BACKUP_PREFIX
      : null;
  if (!prefix) throw new Error("Questo non sembra un backup Brushlings valido");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed.slice(prefix.length));
  } catch {
    throw new Error("Il backup è danneggiato o incompleto");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("Backup non valido");
  const raw = parsed as Record<string, unknown>;
  const expectedVersion = prefix === BACKUP_PREFIX ? 2 : 1;
  if (raw.format !== "brushlings-backup" || raw.version !== expectedVersion) {
    throw new Error("Versione backup non supportata");
  }

  const rawProfile = raw.profile as Record<string, unknown> | undefined;
  const selectedId = rawProfile?.selectedId;
  if (typeof selectedId !== "string" || !isBrushlingId(selectedId)) {
    throw new Error("Creatura selezionata non valida");
  }

  const rawCustomization = raw.customization as Partial<CustomizationState> | undefined;
  const ownedIds = normalizeOwnedIds(rawCustomization?.ownedIds);
  const equippedHabitatId = normalizeEquipped(rawCustomization?.equippedHabitatId, ownedIds) ?? "bubble-room";
  const history = normalizeHistory(raw.history);
  const lifetimeProgress = raw.version === 2
    ? normalizeLifetimeProgress(raw.lifetimeProgress)
    : createLifetimeProgress(history);
  if (!lifetimeProgress) throw new Error("Progressione lifetime non valida");

  return {
    format: "brushlings-backup",
    version: 2,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    profile: {
      selectedId,
      hasChosenStarter: rawProfile?.hasChosenStarter === true,
    },
    customization: {
      ownedIds,
      purchaseLedger: normalizePurchaseLedger(rawCustomization?.purchaseLedger, ownedIds),
      equippedHabitatId,
      equippedAccessoryId: normalizeEquipped(rawCustomization?.equippedAccessoryId, ownedIds),
      equippedDecorId: normalizeEquipped(rawCustomization?.equippedDecorId, ownedIds),
    },
    preferences: normalizePreferences(raw.preferences),
    parentRewards: normalizeParentRewards(raw.parentRewards),
    history,
    lifetimeProgress,
  };
}

export function backupFingerprint(
  backup: Pick<BrushlingsBackup | BrushlingsBackupManifest, "createdAt" | "lifetimeProgress" | "profile">,
): string {
  const date = new Date(backup.createdAt);
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(backup.lifetimeProgress.completedSessions).padStart(3, "0"),
    backup.profile.selectedId.toUpperCase(),
  ].join("-");
}
