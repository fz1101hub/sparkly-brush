import type {
  BrushLiveData,
  ConnectionStatus,
  DiagnosticLog,
  ToothbrushDevice,
} from "./brush-types";

export const HARDWARE_VALIDATION_VERSION = 1;

export type HardwareTestStatus = "pending" | "passed" | "failed" | "blocked";

export type HardwareTestCase = {
  id:
    | "scan-connect"
    | "metadata"
    | "live-timer"
    | "session-sync"
    | "rapid-stops"
    | "offline-gap"
    | "deduplication"
    | "demo-cancel"
    | "reconnect"
    | "factory-reset"
    | "background"
    | "restart"
    | "backup-restore";
  title: string;
  instruction: string;
  success: string;
};

export const HARDWARE_TEST_CASES: readonly HardwareTestCase[] = [
  {
    id: "scan-connect",
    title: "Scansione e connessione",
    instruction: "Avvia la ricerca con il manico vicino e non collegato ad altre app.",
    success: "Il manico appare come Sonicare4Kids e lo stato diventa Collegato.",
  },
  {
    id: "metadata",
    title: "Metadati e batteria",
    instruction: "Controlla modello, firmware e batteria, poi attendi almeno un aggiornamento.",
    success: "I campi restano presenti e coerenti dopo l’aggiornamento batteria.",
  },
  {
    id: "live-timer",
    title: "Timer live e quadranti",
    instruction: "Completa una sessione di due minuti osservando timer e cambi zona.",
    success: "Avvio, arresto, secondi e quattro zone seguono il manico senza salti.",
  },
  {
    id: "session-sync",
    title: "Sincronizzazione sessione",
    instruction: "Ferma il manico e attendi la sincronizzazione automatica.",
    success: "Compare una sola nuova sessione nello storico con durata corretta.",
  },
  {
    id: "rapid-stops",
    title: "Due stop ravvicinati",
    instruction: "Completa due sessioni senza attendere la fine della prima sincronizzazione.",
    success: "Entrambe vengono conservate e contabilizzate una sola volta.",
  },
  {
    id: "offline-gap",
    title: "Sessioni offline, orario e salto ID",
    instruction: "Completa due sessioni con l’app chiusa, riconnetti, poi completa una sessione con l’app aperta.",
    success: "Le sessioni offline arrivano in ordine con orario ricostruito o dichiarato approssimato; il fallback live non viene riaccreditato.",
  },
  {
    id: "deduplication",
    title: "Deduplica manuale",
    instruction: "Premi Sincronizza ultima due volte dopo la stessa sessione.",
    success: "Storico, XP, monete e reward ledger non cambiano al secondo tentativo.",
  },
  {
    id: "demo-cancel",
    title: "Demo durante scansione",
    instruction: "Avvia la scansione e attiva subito la modalità demo.",
    success: "La scansione viene annullata e nessun manico reale resta collegato.",
  },
  {
    id: "reconnect",
    title: "Tre reconnect",
    instruction: "Disconnetti e riconnetti tre volte, avviando brevemente il manico ogni volta.",
    success: "Non compaiono callback duplicate, timer doppi o crash.",
  },
  {
    id: "factory-reset",
    title: "Reset di fabbrica del manico",
    instruction: "Dopo un backup, resetta il manico, ricollegalo e usa Dimentica manico resettato prima della prima nuova sessione.",
    success: "La nuova sessione viene acquisita una volta e storico, XP, monete e Brushling precedenti restano invariati.",
  },
  {
    id: "background",
    title: "App in background",
    instruction: "Avvia una sessione, porta l’app in background e poi torna in primo piano.",
    success: "Lo stato torna coerente e non viene creata alcuna sessione fantasma.",
  },
  {
    id: "restart",
    title: "Riavvio applicazione",
    instruction: "Chiudi completamente e riapri l’app dopo una sessione sincronizzata.",
    success: "Storico, progressione e ultimo dispositivo restano coerenti.",
  },
  {
    id: "backup-restore",
    title: "Backup e ripristino",
    instruction: "Esporta il file .brushlings e ripristinalo su un secondo dispositivo o installazione pulita.",
    success: "Storico completo, progressione e ledger coincidono dopo il ripristino.",
  },
] as const;

export type HardwareTestId = (typeof HARDWARE_TEST_CASES)[number]["id"];

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

const TEST_IDS = new Set<HardwareTestId>(HARDWARE_TEST_CASES.map((test) => test.id));
const STATUSES = new Set<HardwareTestStatus>(["pending", "passed", "failed", "blocked"]);
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
  return Object.fromEntries(HARDWARE_TEST_CASES.map((test) => [
    test.id,
    { status: "pending", note: "", updatedAt: null },
  ])) as Record<HardwareTestId, HardwareTestResult>;
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
  if (!["ios", "android", "web", "unknown"].includes(String(raw.platform))) return null;
  if (typeof raw.startedAt !== "number" || !Number.isFinite(raw.startedAt)) return null;
  if (typeof raw.updatedAt !== "number" || !Number.isFinite(raw.updatedAt)) return null;

  const results = emptyResults();
  if (raw.results && typeof raw.results === "object") {
    Object.entries(raw.results).forEach(([id, candidate]) => {
      if (!TEST_IDS.has(id as HardwareTestId) || !candidate || typeof candidate !== "object") return;
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
    osVersion: typeof raw.osVersion === "string" ? raw.osVersion.slice(0, 120) : "sconosciuta",
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion.slice(0, 120) : "sconosciuta",
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

export function redactDiagnosticMessage(message: string): string {
  return message
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[device-id]")
    .replace(/\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/gi, "[device-id]")
    .replace(
      /\b(?:device[\s_-]?(?:id|identifier)|peripheral(?:[\s_-]?(?:id|identifier))?|id\s+dispositivo|serial(?:\s+number)?|mac(?:\s+address)?|bluetooth\s+address)(?:\s*[:=]\s*|\s+)([^\s,;]+)/gi,
      (match, value: string) => {
        const normalized = value
          .replace(/^[\[({"']+|[\])}"'.!?]+$/g, "")
          .toLocaleLowerCase("it");
        return NON_IDENTIFIER_VALUES.has(normalized) ? match : "device id: [redacted]";
      },
    );
}

function tableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ").trim() || "—";
}

function statusLabel(status: HardwareTestStatus): string {
  if (status === "passed") return "SUPERATO";
  if (status === "failed") return "FALLITO";
  if (status === "blocked") return "BLOCCATO";
  return "DA ESEGUIRE";
}

export function renderHardwareValidationReport(
  run: HardwareValidationRun,
  snapshot: HardwareValidationSnapshot,
  generatedAt = Date.now(),
): string {
  const summary = hardwareValidationSummary(run);
  const device = snapshot.device;
  const testRows = HARDWARE_TEST_CASES.map((test) => {
    const result = run.results[test.id];
    return `| ${tableCell(test.title)} | ${statusLabel(result.status)} | ${tableCell(redactDiagnosticMessage(result.note))} |`;
  }).join("\n");
  const logs = snapshot.diagnosticLogs
    .slice(0, MAX_LOGS)
    .map((log) => `- ${new Date(log.at).toISOString()} · ${log.level.toUpperCase()} · ${redactDiagnosticMessage(log.message)}`)
    .join("\n") || "- Nessun log disponibile";

  return `# Report collaudo hardware — Sparkly Brush

> Il report non include l’identificativo Bluetooth persistente del manico. Eventuali UUID o indirizzi MAC nei log sono oscurati automaticamente.

## Ambiente

| Campo | Valore |
|---|---|
| Run | ${tableCell(run.runId)} |
| Piattaforma | ${tableCell(run.platform)} |
| Versione OS | ${tableCell(run.osVersion)} |
| Versione app | ${tableCell(run.appVersion)} |
| Avviato | ${new Date(run.startedAt).toISOString()} |
| Generato | ${new Date(generatedAt).toISOString()} |

## Snapshot tecnico

| Campo | Valore |
|---|---|
| Stato connessione | ${tableCell(snapshot.connectionStatus)} |
| Adattatore BLE | ${tableCell(snapshot.adapterState)} |
| Nome | ${tableCell(redactDiagnosticMessage(device?.name ?? "non disponibile"))} |
| Modello | ${tableCell(redactDiagnosticMessage(device?.model ?? "non disponibile"))} |
| Firmware | ${tableCell(redactDiagnosticMessage(device?.firmware ?? "non disponibile"))} |
| Batteria | ${device?.battery === undefined ? "non disponibile" : `${device.battery}%`} |
| Stato manico | ${snapshot.live.handleState} |
| Spazzolatura attiva | ${snapshot.live.isBrushing ? "sì" : "no"} |
| Tempo live | ${snapshot.live.elapsedSeconds}s / ${snapshot.live.routineSeconds}s |
| Intensità | ${tableCell(snapshot.live.intensity)} |
| Sessioni recenti in UI | ${snapshot.recentSessionCount} |
| Sessioni lifetime tentate | ${snapshot.attemptedSessions} |
| Sessioni lifetime complete | ${snapshot.completedSessions} |

## Esito matrice

**${summary.completed}/${summary.total} verifiche compilate · ${summary.passed} superate · ${summary.failed} fallite · ${summary.blocked} bloccate**

| Verifica | Esito | Nota |
|---|---|---|
${testRows}

## Diagnostica BLE sanitizzata

${logs}
`;
}
export function reportFileName(run: HardwareValidationRun): string {
  const day = new Date(run.startedAt).toISOString().slice(0, 10);
  return `sparkly-brush-hardware-${run.platform}-${day}.md`;
}
