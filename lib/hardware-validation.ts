import {
  type TranslationKey,
  type TranslationParams,
  translateDynamic,
} from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/locale-types";
import { localizeSonicareMessage } from "@/lib/sonicare-message-i18n";

import type {
  BrushLiveData,
  ConnectionStatus,
  DiagnosticLog,
  ToothbrushDevice,
} from "./brush-types";

export const HARDWARE_VALIDATION_VERSION = 1;

export type HardwareTranslate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const defaultTranslate: HardwareTranslate = (key, params) =>
  translateDynamic(DEFAULT_LOCALE, key, params);

export type HardwareTestStatus = "pending" | "passed" | "failed" | "blocked";

export const HARDWARE_TEST_IDS = [
  "scan-connect",
  "metadata",
  "live-timer",
  "session-sync",
  "rapid-stops",
  "offline-gap",
  "deduplication",
  "demo-cancel",
  "reconnect",
  "factory-reset",
  "background",
  "restart",
  "backup-restore",
] as const;

export type HardwareTestId = (typeof HARDWARE_TEST_IDS)[number];

export type HardwareTestCase = {
  id: HardwareTestId;
  title: string;
  instruction: string;
  success: string;
};

type TestCopyKeys = {
  title: TranslationKey;
  instruction: TranslationKey;
  success: TranslationKey;
};

const TEST_COPY_KEYS: Record<HardwareTestId, TestCopyKeys> = {
  "scan-connect": {
    title: "hardware.test.scanConnect.title",
    instruction: "hardware.test.scanConnect.instruction",
    success: "hardware.test.scanConnect.success",
  },
  metadata: {
    title: "hardware.test.metadata.title",
    instruction: "hardware.test.metadata.instruction",
    success: "hardware.test.metadata.success",
  },
  "live-timer": {
    title: "hardware.test.liveTimer.title",
    instruction: "hardware.test.liveTimer.instruction",
    success: "hardware.test.liveTimer.success",
  },
  "session-sync": {
    title: "hardware.test.sessionSync.title",
    instruction: "hardware.test.sessionSync.instruction",
    success: "hardware.test.sessionSync.success",
  },
  "rapid-stops": {
    title: "hardware.test.rapidStops.title",
    instruction: "hardware.test.rapidStops.instruction",
    success: "hardware.test.rapidStops.success",
  },
  "offline-gap": {
    title: "hardware.test.offlineGap.title",
    instruction: "hardware.test.offlineGap.instruction",
    success: "hardware.test.offlineGap.success",
  },
  deduplication: {
    title: "hardware.test.deduplication.title",
    instruction: "hardware.test.deduplication.instruction",
    success: "hardware.test.deduplication.success",
  },
  "demo-cancel": {
    title: "hardware.test.demoCancel.title",
    instruction: "hardware.test.demoCancel.instruction",
    success: "hardware.test.demoCancel.success",
  },
  reconnect: {
    title: "hardware.test.reconnect.title",
    instruction: "hardware.test.reconnect.instruction",
    success: "hardware.test.reconnect.success",
  },
  "factory-reset": {
    title: "hardware.test.factoryReset.title",
    instruction: "hardware.test.factoryReset.instruction",
    success: "hardware.test.factoryReset.success",
  },
  background: {
    title: "hardware.test.background.title",
    instruction: "hardware.test.background.instruction",
    success: "hardware.test.background.success",
  },
  restart: {
    title: "hardware.test.restart.title",
    instruction: "hardware.test.restart.instruction",
    success: "hardware.test.restart.success",
  },
  "backup-restore": {
    title: "hardware.test.backupRestore.title",
    instruction: "hardware.test.backupRestore.instruction",
    success: "hardware.test.backupRestore.success",
  },
};

/** Returns the localized hardware-test matrix; Italian remains the API fallback. */
export function getHardwareTestCases(
  t: HardwareTranslate = defaultTranslate,
): readonly HardwareTestCase[] {
  return HARDWARE_TEST_IDS.map((id) => {
    const copy = TEST_COPY_KEYS[id];
    return {
      id,
      title: t(copy.title),
      instruction: t(copy.instruction),
      success: t(copy.success),
    };
  });
}

/** @deprecated Prefer getHardwareTestCases(t) in localized UI. */
export const HARDWARE_TEST_CASES = getHardwareTestCases();

export function hardwareTestStatusLabel(
  status: HardwareTestStatus,
  t: HardwareTranslate = defaultTranslate,
): string {
  return t(`hardware.status.${status}` as TranslationKey);
}

export function connectionStatusLabel(
  status: ConnectionStatus,
  t: HardwareTranslate = defaultTranslate,
): string {
  return t(`hardware.connection.${status}` as TranslationKey);
}

export type HardwareTestResult = {
  status: HardwareTestStatus;
  note: string;
  updatedAt: number | null;
};

export type HardwareValidationRun = {
  version: typeof HARDWARE_VALIDATION_VERSION;
  runId: string;
  platform: "ios" | "android" | "web" | "unknown";
  osVersion: string;
  appVersion: string;
  startedAt: number;
  updatedAt: number;
  results: Record<HardwareTestId, HardwareTestResult>;
};

export type HardwareValidationSnapshot = {
  connectionStatus: ConnectionStatus;
  adapterState: string;
  device: Omit<ToothbrushDevice, "id"> | null;
  live: BrushLiveData;
  recentSessionCount: number;
  attemptedSessions: number;
  completedSessions: number;
  diagnosticLogs: DiagnosticLog[];
};

const TEST_IDS = new Set<HardwareTestId>(HARDWARE_TEST_IDS);
const STATUSES = new Set<HardwareTestStatus>([
  "pending",
  "passed",
  "failed",
  "blocked",
]);
const MAX_NOTE_LENGTH = 1_000;
const MAX_LOGS = 80;
const NON_IDENTIFIER_VALUES = new Set([
  "assente",
  "attualmente",
  "available",
  "connected",
  "connessa",
  "connesso",
  "currently",
  "disconnected",
  "disconnessa",
  "disconnesso",
  "disponibile",
  "during",
  "durante",
  "e",
  "error",
  "errore",
  "è",
  "found",
  "is",
  "missing",
  "nessuna",
  "nessuno",
  "no",
  "non",
  "not",
  "null",
  "sconosciuta",
  "sconosciuto",
  "trovata",
  "trovato",
  "unavailable",
  "undefined",
  "unknown",
  "was",
]);

function emptyResults(): Record<HardwareTestId, HardwareTestResult> {
  return Object.fromEntries(
    HARDWARE_TEST_IDS.map((id) => [
      id,
      { status: "pending", note: "", updatedAt: null },
    ]),
  ) as Record<HardwareTestId, HardwareTestResult>;
}

export function createHardwareValidationRun(
  platform: HardwareValidationRun["platform"],
  appVersion: string,
  osVersion: string,
  now = Date.now(),
): HardwareValidationRun {
  return {
    version: HARDWARE_VALIDATION_VERSION,
    runId: `hardware-${platform}-${now}`,
    platform,
    osVersion: osVersion.slice(0, 120),
    appVersion: appVersion.slice(0, 120),
    startedAt: now,
    updatedAt: now,
    results: emptyResults(),
  };
}

export function normalizeHardwareValidationRun(value: unknown): HardwareValidationRun | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<HardwareValidationRun>;
  if (raw.version !== HARDWARE_VALIDATION_VERSION) return null;
  if (typeof raw.runId !== "string" || raw.runId.length > 256) return null;
  if (!["ios", "android", "web", "unknown"].includes(String(raw.platform))) {
    return null;
  }
  if (typeof raw.startedAt !== "number" || !Number.isFinite(raw.startedAt)) {
    return null;
  }
  if (typeof raw.updatedAt !== "number" || !Number.isFinite(raw.updatedAt)) {
    return null;
  }

  const results = emptyResults();
  if (raw.results && typeof raw.results === "object") {
    Object.entries(raw.results).forEach(([id, candidate]) => {
      if (
        !TEST_IDS.has(id as HardwareTestId) ||
        !candidate ||
        typeof candidate !== "object"
      ) {
        return;
      }
      const result = candidate as Partial<HardwareTestResult>;
      if (!STATUSES.has(result.status as HardwareTestStatus)) return;
      results[id as HardwareTestId] = {
        status: result.status as HardwareTestStatus,
        note: typeof result.note === "string" ? result.note.slice(0, MAX_NOTE_LENGTH) : "",
        updatedAt: typeof result.updatedAt === "number" && Number.isFinite(result.updatedAt)
          ? result.updatedAt
          : null,
      };
    });
  }

  return {
    version: HARDWARE_VALIDATION_VERSION,
    runId: raw.runId,
    platform: raw.platform as HardwareValidationRun["platform"],
    osVersion:
      typeof raw.osVersion === "string"
        ? raw.osVersion.slice(0, 120)
        : defaultTranslate("hardware.unknownVersion"),
    appVersion:
      typeof raw.appVersion === "string"
        ? raw.appVersion.slice(0, 120)
        : defaultTranslate("hardware.unknownVersion"),
    startedAt: raw.startedAt,
    updatedAt: raw.updatedAt,
    results,
  };
}

export function updateHardwareTestResult(
  run: HardwareValidationRun,
  id: HardwareTestId,
  patch: Partial<Pick<HardwareTestResult, "status" | "note">>,
  now = Date.now(),
): HardwareValidationRun {
  const current = run.results[id];
  return {
    ...run,
    updatedAt: now,
    results: {
      ...run.results,
      [id]: {
        status: patch.status && STATUSES.has(patch.status) ? patch.status : current.status,
        note: patch.note !== undefined ? patch.note.slice(0, MAX_NOTE_LENGTH) : current.note,
        updatedAt: now,
      },
    },
  };
}

export function hardwareValidationSummary(run: HardwareValidationRun) {
  const values = Object.values(run.results);
  return {
    total: values.length,
    passed: values.filter((result) => result.status === "passed").length,
    failed: values.filter((result) => result.status === "failed").length,
    blocked: values.filter((result) => result.status === "blocked").length,
    completed: values.filter((result) => result.status !== "pending").length,
  };
}

export function redactDiagnosticMessage(
  message: string,
  t: HardwareTranslate = defaultTranslate,
): string {
  return message
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      t("hardware.report.deviceId"),
    )
    .replace(
      /\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi,
      t("hardware.report.deviceId"),
    )
    .replace(
      /\b(?:device[\s_-]?(?:id|identifier)|peripheral(?:[\s_-]?(?:id|identifier))?|id\s+dispositivo|serial(?:\s+number)?|mac(?:\s+address)?|bluetooth\s+address)(?:\s*[:=]\s*|\s+)([^\s,;]+)/gi,
      (match, value: string) => {
        const normalized = value
          .replace(/^[\[({"']+|[\])}"'.!?]+$/g, "")
          .toLocaleLowerCase("it");
        return NON_IDENTIFIER_VALUES.has(normalized)
          ? match
          : t("hardware.report.redactedDevice");
      },
    );
}

function tableCell(value: string, t: HardwareTranslate): string {
  return (
    value
      .replace(/\|/g, "\\|")
      .replace(/[\r\n]+/g, " ")
      .trim() || t("hardware.report.emptyCell")
  );
}

function reportStatusLabel(
  status: HardwareTestStatus,
  t: HardwareTranslate,
): string {
  return t(`hardware.report.status.${status}` as TranslationKey);
}

function adapterStateLabel(state: string, t: HardwareTranslate): string {
  const keyByState: Record<string, TranslationKey> = {
    Unknown: "device.adapterState.unknown",
    Resetting: "device.adapterState.resetting",
    Unsupported: "device.adapterState.unsupported",
    Unauthorized: "device.adapterState.unauthorized",
    PoweredOff: "device.adapterState.poweredOff",
    PoweredOn: "device.adapterState.poweredOn",
  };
  const key = keyByState[state];
  return key ? t(key) : state;
}

function handleStateLabel(state: number, t: HardwareTranslate): string {
  const keyByState: Record<number, TranslationKey> = {
    0: "device.handleState.off",
    1: "device.handleState.idle",
    2: "device.handleState.brushing",
    3: "device.handleState.charging",
    4: "device.handleState.shuttingDown",
    6: "device.handleState.verifying",
    7: "device.handleState.background",
  };
  const key = keyByState[state];
  return key ? t(key) : t("device.unknown");
}

function intensityLabel(
  intensity: BrushLiveData["intensity"],
  t: HardwareTranslate,
): string {
  const keyByIntensity: Record<BrushLiveData["intensity"], TranslationKey> = {
    bassa: "device.intensity.low",
    media: "device.intensity.medium",
    alta: "device.intensity.high",
    sconosciuta: "device.unknown",
  };
  return t(keyByIntensity[intensity]);
}

/**
 * Builds a shareable report. Pass the active locale's `t` callback to localize
 * every report label; omitting it keeps the historic Italian output.
 */
export function renderHardwareValidationReport(
  run: HardwareValidationRun,
  snapshot: HardwareValidationSnapshot,
  generatedAt = Date.now(),
  t: HardwareTranslate = defaultTranslate,
): string {
  const summary = hardwareValidationSummary(run);
  const device = snapshot.device;
  const testRows = getHardwareTestCases(t)
    .map((test) => {
      const result = run.results[test.id];
      return `| ${tableCell(test.title, t)} | ${reportStatusLabel(result.status, t)} | ${tableCell(redactDiagnosticMessage(result.note, t), t)} |`;
    })
    .join("\n");
  const logs =
    snapshot.diagnosticLogs
      .slice(0, MAX_LOGS)
      .map(
        (log) =>
          `- ${new Date(log.at).toISOString()} · ${log.level.toUpperCase()} · ${redactDiagnosticMessage(
            log.translationKey
              ? t(log.translationKey, log.translationParams)
              : localizeSonicareMessage(log.message, t),
            t,
          )}`,
      )
      .join("\n") || `- ${t("hardware.report.noLogs")}`;
  const unavailable = t("hardware.report.unavailable");

  return `# ${t("hardware.report.title")}

> ${t("hardware.report.intro")}

## ${t("hardware.report.environment")}

| ${t("hardware.report.field")} | ${t("hardware.report.value")} |
|---|---|
| ${t("hardware.report.run")} | ${tableCell(run.runId, t)} |
| ${t("hardware.report.platform")} | ${tableCell(run.platform, t)} |
| ${t("hardware.report.osVersion")} | ${tableCell(run.osVersion, t)} |
| ${t("hardware.report.appVersion")} | ${tableCell(run.appVersion, t)} |
| ${t("hardware.report.started")} | ${new Date(run.startedAt).toISOString()} |
| ${t("hardware.report.generated")} | ${new Date(generatedAt).toISOString()} |

## ${t("hardware.report.technicalSnapshot")}

| ${t("hardware.report.field")} | ${t("hardware.report.value")} |
|---|---|
| ${t("hardware.report.connectionStatus")} | ${tableCell(connectionStatusLabel(snapshot.connectionStatus, t), t)} |
| ${t("hardware.report.adapter")} | ${tableCell(adapterStateLabel(snapshot.adapterState, t), t)} |
| ${t("hardware.report.name")} | ${tableCell(redactDiagnosticMessage(device?.name ?? unavailable, t), t)} |
| ${t("hardware.report.model")} | ${tableCell(redactDiagnosticMessage(device?.model ?? unavailable, t), t)} |
| ${t("hardware.report.firmware")} | ${tableCell(redactDiagnosticMessage(device?.firmware ?? unavailable, t), t)} |
| ${t("hardware.report.battery")} | ${device?.battery === undefined ? unavailable : `${device.battery}%`} |
| ${t("hardware.report.handleState")} | ${tableCell(handleStateLabel(snapshot.live.handleState, t), t)} |
| ${t("hardware.report.brushingActive")} | ${snapshot.live.isBrushing ? t("hardware.report.yes") : t("hardware.report.no")} |
| ${t("hardware.report.liveTime")} | ${snapshot.live.elapsedSeconds}s / ${snapshot.live.routineSeconds}s |
| ${t("hardware.report.intensity")} | ${tableCell(intensityLabel(snapshot.live.intensity, t), t)} |
| ${t("hardware.report.recentSessions")} | ${snapshot.recentSessionCount} |
| ${t("hardware.report.attemptedSessions")} | ${snapshot.attemptedSessions} |
| ${t("hardware.report.completedSessions")} | ${snapshot.completedSessions} |

## ${t("hardware.report.matrix")}

**${t("hardware.report.summary", summary)}**

| ${t("hardware.report.test")} | ${t("hardware.report.result")} | ${t("hardware.report.note")} |
|---|---|---|
${testRows}

## ${t("hardware.report.diagnostics")}

${logs}
`;
}

export function reportFileName(run: HardwareValidationRun): string {
  const day = new Date(run.startedAt).toISOString().slice(0, 10);
  return `sparkly-brush-hardware-${run.platform}-${day}.md`;
}
