import { isBrushlingId, type BrushlingId } from "@/lib/brushlings";
import { EMPTY_AWARDS, normalizeAwards, type AlbumAwards } from "@/lib/album";
import { BEDTIME_ITEMS, type BedtimeDone, type BedtimeItem } from "@/lib/bedtime";
import { EPISODES } from "@/lib/learning/serial-story";
import { AGE_GROUPS, DENTIST_NOTICE_DAYS, type AgeGroup, type DentistNoticeDays } from "@/lib/dental-care";
import { GOAL_IDS, GOAL_TARGETS, type GoalId, type GoalProposal, type GoalTarget } from "@/lib/milestones";
import { createProfileStorage, createProfileStore } from "@/lib/profile-scope";
import { cleanClinic, EMPTY_CLINIC, normalizeMonthStats, type ClinicHeader, type DentalRecord, type DentalRecordKind, type MonthStat } from "@/lib/reports";

export type { DentalRecordKind } from "@/lib/reports";
export const DENTAL_RECORD_KINDS: readonly DentalRecordKind[] = ["visit", "sealant", "fluoride", "ortho"];
export const MAX_DENTAL_NOTE = 200;
const MAX_DENTAL_RECORDS = 100;

/**
 * Small per-child settings and records added on 27 October 2026 (one record per profile, part of
 * the complete backup): forgiven days of the streak, the session length chosen by the parent and
 * the names the child gave to the creatures.
 */
export const EXTRAS_KEY = "brushlings.extras.v1";

/** "offline": brushed without the phone (voce 62), counts as a brushing day for the streak. */
export type ProtectedReason = "sick" | "holiday" | "offline";
export type ProtectedDay = { day: string; reason: ProtectedReason };

/** Seconds of the timer session; the parent shortens it for the youngest, then grows it to 2 minutes. */
export const SESSION_SECONDS_OPTIONS = [60, 90, 120] as const;
export type SessionSeconds = (typeof SESSION_SECONDS_OPTIONS)[number];

export const MAX_NAME_LENGTH = 16;
export const MAX_NOTE_LENGTH = 400;
const MAX_PROTECTED_DAYS = 120;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type Extras = {
  version: 1;
  protectedDays: ProtectedDay[];
  sessionSeconds: SessionSeconds;
  creatureNames: Partial<Record<BrushlingId, string>>;
  /** For the toothpaste advice (voce 58); null until the parent chooses. */
  ageGroup: AgeGroup | null;
  /** The parent's note in the babysitter guide (voce 34). */
  babysitterNote: string;
  /** Next dentist visit (voce 32) and how many days before it the reminder arrives. */
  dentistVisit: { day: string; noticeDays: DentistNoticeDays } | null;
  /** Days the surprise extra step was done (voce 56). */
  extraStepDays: string[];
  /** «Spazzoliamo insieme» (voce 27): the parent's timer next to the child's. */
  brushTogether: boolean;
  /** Day the brush head was last replaced (voce 35); null until the parent records it. */
  headChangedOn: string | null;
  /** Sunday and seasonal stickers of the album (voci 14 e 15). */
  album: AlbumAwards;
  /** Mondays of the weeks whose challenge was won (voce 51) and whose family boss was beaten (voce 13). */
  challengeWins: string[];
  bossWins: string[];
  /** "YYYY-MM" of the perfect months (voce 12). */
  perfectMonths: string[];
  /** First day of the guided first week (voce 18); skipped for children who already brushed. */
  discoveryStart: string | null;
  discoverySkipped: boolean;
  /** The goal the child proposed, waiting for the parent (voce 19). */
  goalProposal: GoalProposal | null;
  /** Header of the dental practice on the printed report (voce 30). */
  clinic: ClinicHeader;
  /** The dental booklet (voce 64). */
  dentalRecords: DentalRecord[];
  /** Monthly regularity kept for the long-term chart (voce 63). */
  monthStats: MonthStat[];
  /** Local notification on Sunday evening with the weekly summary (voce 31). */
  weeklySummary: boolean;
  /** Company during the session (voci 8, 7 e 9) and the episodes of the serial story heard. */
  creatureVoice: boolean;
  serialStory: boolean;
  sessionSong: boolean;
  serialHeard: number[];
  /** Bedtime missions turned on by the parent and those done tonight (voce 28). */
  bedtimeItems: BedtimeItem[];
  bedtimeDone: BedtimeDone | null;
  /** Holiday mode until this day included (voce 25). */
  vacationUntil: string | null;
};

export const DEFAULT_EXTRAS: Extras = {
  version: 1,
  protectedDays: [],
  sessionSeconds: 120,
  creatureNames: {},
  ageGroup: null,
  babysitterNote: "",
  dentistVisit: null,
  extraStepDays: [],
  brushTogether: false,
  headChangedOn: null,
  album: EMPTY_AWARDS,
  challengeWins: [],
  bossWins: [],
  perfectMonths: [],
  discoveryStart: null,
  discoverySkipped: false,
  goalProposal: null,
  clinic: EMPTY_CLINIC,
  dentalRecords: [],
  monthStats: [],
  weeklySummary: false,
  creatureVoice: false,
  serialStory: false,
  sessionSong: false,
  serialHeard: [],
  bedtimeItems: [],
  bedtimeDone: null,
  vacationUntil: null,
};

/** Letters, digits, spaces and a few signs; trimmed and cut to MAX_NAME_LENGTH. */
export function cleanCreatureName(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\p{M} '’.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

const dayKeys = (list: unknown): string[] => Array.isArray(list)
  ? [...new Set(list.filter((day): day is string => typeof day === "string" && DAY_KEY.test(day)))].sort().slice(-104)
  : [];

export function normalizeExtras(raw: unknown): Extras {
  const value = (raw && typeof raw === "object" ? raw : {}) as Partial<Extras>;
  const byDay = new Map<string, ProtectedDay>();
  if (Array.isArray(value.protectedDays)) {
    for (const item of value.protectedDays) {
      const day = item as Partial<ProtectedDay> | null;
      if (day && typeof day.day === "string" && DAY_KEY.test(day.day) && (day.reason === "sick" || day.reason === "holiday" || day.reason === "offline")) {
        byDay.set(day.day, { day: day.day, reason: day.reason });
      }
    }
  }
  const names: Partial<Record<BrushlingId, string>> = {};
  if (value.creatureNames && typeof value.creatureNames === "object") {
    for (const [id, name] of Object.entries(value.creatureNames)) {
      if (isBrushlingId(id) && typeof name === "string" && cleanCreatureName(name)) names[id] = cleanCreatureName(name);
    }
  }
  return {
    version: 1,
    protectedDays: [...byDay.values()].sort((first, second) => first.day.localeCompare(second.day)).slice(-MAX_PROTECTED_DAYS),
    sessionSeconds: SESSION_SECONDS_OPTIONS.includes(value.sessionSeconds as SessionSeconds)
      ? (value.sessionSeconds as SessionSeconds)
      : 120,
    creatureNames: names,
    ageGroup: AGE_GROUPS.includes(value.ageGroup as AgeGroup) ? (value.ageGroup as AgeGroup) : null,
    babysitterNote: typeof value.babysitterNote === "string" ? value.babysitterNote.slice(0, MAX_NOTE_LENGTH) : "",
    dentistVisit:
      value.dentistVisit
      && typeof value.dentistVisit.day === "string"
      && DAY_KEY.test(value.dentistVisit.day)
      && DENTIST_NOTICE_DAYS.includes(value.dentistVisit.noticeDays)
        ? { day: value.dentistVisit.day, noticeDays: value.dentistVisit.noticeDays }
        : null,
    extraStepDays: Array.isArray(value.extraStepDays)
      ? [...new Set(value.extraStepDays.filter((day): day is string => typeof day === "string" && DAY_KEY.test(day)))].sort().slice(-60)
      : [],
    brushTogether: value.brushTogether === true,
    headChangedOn: typeof value.headChangedOn === "string" && DAY_KEY.test(value.headChangedOn) ? value.headChangedOn : null,
    album: normalizeAwards(value.album),
    challengeWins: dayKeys(value.challengeWins),
    bossWins: dayKeys(value.bossWins),
    perfectMonths: Array.isArray(value.perfectMonths)
      ? [...new Set(value.perfectMonths.filter((month): month is string => typeof month === "string" && /^\d{4}-\d{2}$/.test(month)))].sort().slice(-120)
      : [],
    discoveryStart: typeof value.discoveryStart === "string" && DAY_KEY.test(value.discoveryStart) ? value.discoveryStart : null,
    discoverySkipped: value.discoverySkipped === true,
    goalProposal:
      value.goalProposal
      && GOAL_IDS.includes(value.goalProposal.goal as GoalId)
      && GOAL_TARGETS.includes(value.goalProposal.target as GoalTarget)
      && typeof value.goalProposal.proposedAt === "number"
        ? { goal: value.goalProposal.goal, target: value.goalProposal.target, proposedAt: value.goalProposal.proposedAt }
        : null,
    clinic: cleanClinic(value.clinic),
    dentalRecords: Array.isArray(value.dentalRecords)
      ? value.dentalRecords
        .filter((record): record is DentalRecord => Boolean(record)
          && typeof record.id === "string" && record.id.length > 0 && record.id.length <= 40
          && DENTAL_RECORD_KINDS.includes(record.kind)
          && typeof record.day === "string" && DAY_KEY.test(record.day))
        .map((record) => ({ id: record.id, kind: record.kind, day: record.day, note: typeof record.note === "string" ? record.note.slice(0, MAX_DENTAL_NOTE) : "" }))
        .slice(-MAX_DENTAL_RECORDS)
      : [],
    monthStats: normalizeMonthStats(value.monthStats),
    weeklySummary: value.weeklySummary === true,
    creatureVoice: value.creatureVoice === true,
    serialStory: value.serialStory === true,
    sessionSong: value.sessionSong === true,
    serialHeard: Array.isArray(value.serialHeard)
      ? [...new Set(value.serialHeard.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < EPISODES.length))].sort((a, b) => a - b)
      : [],
    bedtimeItems: Array.isArray(value.bedtimeItems) ? [...new Set(value.bedtimeItems.filter((item): item is BedtimeItem => BEDTIME_ITEMS.includes(item)))] : [],
    bedtimeDone:
      value.bedtimeDone && typeof value.bedtimeDone.day === "string" && DAY_KEY.test(value.bedtimeDone.day) && Array.isArray(value.bedtimeDone.items)
        ? { day: value.bedtimeDone.day, items: [...new Set(value.bedtimeDone.items.filter((item): item is BedtimeItem => BEDTIME_ITEMS.includes(item)))] }
        : null,
    vacationUntil: typeof value.vacationUntil === "string" && DAY_KEY.test(value.vacationUntil) ? value.vacationUntil : null,
  };
}

export const getExtrasStorage = createProfileStore((profileId: string) => {
  const storage = createProfileStorage(profileId);
  return {
    async load(): Promise<Extras> {
      const raw = await storage.getItem(EXTRAS_KEY);
      if (!raw) return { ...DEFAULT_EXTRAS };
      try {
        return normalizeExtras(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_EXTRAS };
      }
    },
    async save(extras: Extras): Promise<void> {
      await storage.setItem(EXTRAS_KEY, JSON.stringify(normalizeExtras(extras)));
    },
  };
});
