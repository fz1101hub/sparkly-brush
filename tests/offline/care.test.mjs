import test from "node:test";
import assert from "node:assert/strict";
import { normalizeChildCare, isCalendarDate, brushHeadDueDate, brushingPhase } from "../../lib/child-care.ts";
import { createSessionSummary } from "../../lib/session-summary.ts";
import { parseManualCheckpoint, getManualSessionStorage } from "../../lib/manual-session-storage.ts";
import { parentRewardProgress } from "../../lib/parent-rewards.ts";
import { getPreferencesStorage } from "../../lib/preferences.ts";
import { records, failWrite } from "./storage.mjs";
import { planSmartReminders } from "../../lib/reminder-plan.ts";
import { parentRecordedSession } from "../../lib/parent-recorded-session.ts";

const session = (id, day, hour, overrides = {}) => ({ id, startedAt: new Date(2026, 9, day, hour).getTime(), durationSeconds: 120, targetSeconds: 120, completed: true, source: "manual", ...overrides });

test("untrusted care settings are allowlisted and names are bounded by Unicode characters", () => {
  const result = normalizeChildCare({ brushlingName: " 🦷".repeat(40), targetSeconds: -1, calmMode: "false", unknown: "secret", babysitterInstructions: "x".repeat(1000), brushHeadChangedOn: "2026-02-31" });
  assert.equal([...result.brushlingName].length, 24);
  assert.equal(result.targetSeconds, 120);
  assert.equal(result.calmMode, false);
  assert.equal(result.babysitterInstructions.length, 600);
  assert.equal(result.brushHeadChangedOn, "");
  assert.equal("unknown" in result, false);
});

test("head replacement uses calendar months and clamps month ends", () => {
  assert.equal(isCalendarDate("2026-02-29"), false);
  assert.equal(isCalendarDate("2028-02-29"), true);
  const due = brushHeadDueDate("2026-01-31");
  assert.deepEqual([due.getFullYear(), due.getMonth(), due.getDate()], [2026, 3, 30]);
  const nextYear = brushHeadDueDate("2026-11-30");
  assert.deepEqual([nextYear.getFullYear(), nextYear.getMonth(), nextYear.getDate()], [2027, 1, 28]);
});

test("zone transitions scale with the chosen duration and never overflow", () => {
  for (const target of [60, 90, 120]) {
    assert.equal(brushingPhase(0, target).zone, 0);
    assert.equal(brushingPhase(target / 4, target).zone, 1);
    assert.equal(brushingPhase(target / 2, target).zone, 2);
    assert.equal(brushingPhase(target * 3 / 4, target).zone, 3);
    assert.deepEqual(brushingPhase(target * 4, target), { zone: 3, surface: 2 });
  }
});

test("a shortened checkpoint survives recovery without becoming a two-minute session", async () => {
  const checkpoint = { version: 1, id: "short", startedAt: Date.now(), elapsedSeconds: 45, targetSeconds: 60, demo: false };
  const store = getManualSessionStorage("child-short");
  await store.save(checkpoint);
  assert.deepEqual(await store.load(), checkpoint);
  const complete = { ...checkpoint, elapsedSeconds: 60, pending: { id: "short", startedAt: checkpoint.startedAt, durationSeconds: 60, targetSeconds: 60, completed: true, source: "manual", rewardPolicy: "completed-only" } };
  assert.deepEqual(parseManualCheckpoint(JSON.stringify(complete)), complete);
  assert.throws(() => parseManualCheckpoint(JSON.stringify({ ...complete, targetSeconds: 120 })));
});

test("legacy 120-second checkpoints remain readable", () => {
  const legacy = { version: 1, id: "legacy", startedAt: Date.now(), elapsedSeconds: 90, demo: false };
  assert.deepEqual(parseManualCheckpoint(JSON.stringify(legacy)), legacy);
  assert.throws(() => parseManualCheckpoint(JSON.stringify({ ...legacy, targetSeconds: 1 })));
});

test("settings persist separately for siblings and a disk error does not overwrite them", async () => {
  const first = getPreferencesStorage("care-first");
  const second = getPreferencesStorage("care-second");
  await first.saveAppPreferences({ ...await first.loadAppPreferences(), care: normalizeChildCare({ brushlingName: "Luna", targetSeconds: 60 }) });
  assert.equal((await first.loadAppPreferences()).care.brushlingName, "Luna");
  assert.equal((await second.loadAppPreferences()).care, undefined);
  failWrite();
  await assert.rejects(async () => first.saveAppPreferences({ ...await first.loadAppPreferences(), care: normalizeChildCare({ brushlingName: "Lost" }) }));
  assert.equal((await first.loadAppPreferences()).care.brushlingName, "Luna");
  assert.ok(records.size > 0);
});

test("old brushing sessions cannot unlock a newly created family reward", () => {
  const reward = { id: "r", title: "Book", requirement: "completed-sessions", target: 2, createdAt: new Date(2026, 9, 3, 12).getTime(), deliveredAt: null };
  const history = [session("old1", 1, 8), session("old2", 2, 8), session("morning", 3, 8), session("new", 3, 20)];
  assert.equal(parentRewardProgress(reward, history).progress, 1);
  assert.equal(parentRewardProgress(reward, history).unlocked, false);
  assert.equal(parentRewardProgress({ ...reward, requirement: "perfect-days" }, history).progress, 0);
});

test("summary covers more than 120 rows and excludes approximate dates from calendar metrics", () => {
  const summary = createSessionSummary();
  for (let day = 1; day <= 200; day++) {
    summary.add(session(`a${day}`, day, 8));
    summary.add(session(`b${day}`, day, 20));
  }
  summary.add(session("approx", 201, 8, { timeConfidence: "approximate" }));
  summary.add(session("incomplete", 202, 8, { completed: false, durationSeconds: 12 }));
  const result = summary.result();
  assert.equal(result.completedSessions, 401);
  assert.equal(result.perfectDays, 200);
  assert.equal(result.longestStreakDays, 200);
  assert.equal(result.approximateSessions, 1);
  assert.equal(result.attemptedSessions, 402);
});

test("a completed evening removes both reminders while tomorrow remains scheduled", () => {
  const now = new Date(2026, 9, 26, 19).getTime();
  const settings = { morning: "08:00", evening: "20:00", lastCall: true };
  const plan = planSmartReminders("emma", settings, [{ date: "2026-10-26", morning: true, evening: true }], now);
  assert.equal(plan.length, 3);
  assert.ok(plan.every((item) => item.at.getDate() === 27));
  assert.ok(plan.every((item) => item.identifier.includes("emma")));
  const missed = planSmartReminders("emma", settings, [], now);
  assert.equal(missed.filter((item) => item.at.getDate() === 26).length, 2);
});

test("the gentle reminder cannot precede the parent's chosen evening time", () => {
  const plan = planSmartReminders("late", { morning: "08:00", evening: "21:30", lastCall: true }, [], new Date(2026, 9, 26, 12).getTime());
  assert.ok(plan.every((item) => item.period !== "last-call"));
});

test("smart schedules for eight siblings fit in the iOS limit", () => {
  const now = new Date(2026, 9, 26, 0).getTime();
  const plans = Array.from({ length: 8 }, (_, child) => planSmartReminders(`child-${child}`, { morning: "08:00", evening: "20:00", lastCall: true }, [], now)).flat();
  assert.equal(plans.length, 48);
  assert.equal(new Set(plans.map((item) => item.identifier)).size, 48);
});

test("parent records reject future evenings and retain the same identity on retry", () => {
  const morning = new Date(2026, 9, 26, 9).getTime();
  assert.throws(() => parentRecordedSession("evening", 120, morning));
  const first = parentRecordedSession("morning", 60, morning);
  const retry = parentRecordedSession("morning", 60, morning + 1000);
  assert.equal(first.id, retry.id);
  assert.equal(first.source, "manual");
  assert.equal(first.deviceSessionId, undefined);
  assert.equal(first.completed, true);
});
