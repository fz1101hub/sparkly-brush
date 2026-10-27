import { awardStickers } from "@/lib/album";
import type { BrushSession } from "@/lib/brush-types";
import { localDateKey } from "@/lib/day-progress";
import type { Extras } from "@/lib/extras";
import { isPerfectMonth, previousMonthKey } from "@/lib/milestones";
import { mergeMonthStats } from "@/lib/reports";
import { challengeOfWeek, challengeProgress, CHALLENGE_TARGETS, familyBossWeeks, previousWeekStart, weekStart } from "@/lib/weekly";

const MAX_KEYS = 104;
const add = (list: readonly string[], key: string) => (list.includes(key) ? [...list] : [...list, key].sort().slice(-MAX_KEYS));

export type MotivationInputs = {
  history: readonly BrushSession[];
  familyHistories: readonly (readonly BrushSession[])[];
  completedSessions: number;
  now: number;
};

/**
 * The child's long-term records (lotto 4) to update for the sessions seen so far: Sunday and
 * seasonal stickers, won weekly challenges (this week and last), beaten family bosses, the
 * perfect month just ended and the start of the guided first week. Empty when nothing changes.
 */
export function motivationUpdates(extras: Extras, inputs: MotivationInputs): Partial<Extras> {
  const { history, familyHistories, completedSessions, now } = inputs;
  const updates: Partial<Extras> = {};
  const album = awardStickers(extras.album, history);
  if (album) updates.album = album;
  const start = weekStart(now);
  for (const week of [previousWeekStart(start), start]) {
    const id = challengeOfWeek(week);
    const key = localDateKey(week);
    if (!extras.challengeWins.includes(key) && challengeProgress(id, history, extras.extraStepDays, week) >= CHALLENGE_TARGETS[id]) {
      updates.challengeWins = add(updates.challengeWins ?? extras.challengeWins, key);
    }
  }
  for (const week of familyBossWeeks(familyHistories, now).slice(-2)) {
    if (week.defeated && !extras.bossWins.includes(week.weekKey)) {
      updates.bossWins = add(updates.bossWins ?? extras.bossWins, week.weekKey);
    }
  }
  const month = previousMonthKey(now);
  if (!extras.perfectMonths.includes(month) && isPerfectMonth(history, month)) {
    updates.perfectMonths = add(extras.perfectMonths, month);
  }
  if (extras.discoveryStart === null && !extras.discoverySkipped) {
    // Only a child starting now gets the guided week; the others already know the app.
    if (completedSessions === 0) updates.discoveryStart = localDateKey(now);
    else updates.discoverySkipped = true;
  }
  const monthStats = mergeMonthStats(extras.monthStats, history, now);
  if (JSON.stringify(monthStats) !== JSON.stringify(extras.monthStats)) updates.monthStats = monthStats;
  return updates;
}
