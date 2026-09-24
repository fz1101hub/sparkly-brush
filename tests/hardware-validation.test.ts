import { describe, expect, it } from "vitest";

import {
  createHardwareValidationRun,
  HARDWARE_TEST_CASES,
  hardwareValidationSummary,
  normalizeHardwareValidationRun,
  redactDiagnosticMessage,
  renderHardwareValidationReport,
  updateHardwareTestResult,
} from "@/lib/hardware-validation";

const startedAt = Date.UTC(2026, 8, 23, 10, 0, 0);

function run() {
  return createHardwareValidationRun("ios", "1.0.0", "18.0", startedAt);
}

describe("hardware validation assistant", () => {
  it("crea tutti i casi come pending e aggiorna un risultato senza mutare l’originale", () => {
    const initial = run();
    const next = updateHardwareTestResult(initial, "scan-connect", {
      status: "passed",
      note: "Connessione riuscita",
    }, startedAt + 1_000);

    expect(Object.keys(initial.results)).toHaveLength(HARDWARE_TEST_CASES.length);
    expect(initial.results["scan-connect"].status).toBe("pending");
    expect(next.results["scan-connect"]).toEqual({
      status: "passed",
      note: "Connessione riuscita",
      updatedAt: startedAt + 1_000,
    });
    expect(hardwareValidationSummary(next)).toMatchObject({ completed: 1, passed: 1, failed: 0 });
  });

  it("normalizza solo test e stati conosciuti e tronca note sovradimensionate", () => {
    const raw = run() as unknown as Record<string, unknown>;
    raw.results = {
      "scan-connect": { status: "passed", note: "x".repeat(2_000), updatedAt: startedAt },
      unknown: { status: "passed", note: "non ammesso", updatedAt: startedAt },
      metadata: { status: "invented", note: "non ammesso", updatedAt: startedAt },
    };

    const normalized = normalizeHardwareValidationRun(raw);
    expect(normalized?.results["scan-connect"].note).toHaveLength(1_000);
    expect(normalized?.results.metadata.status).toBe("pending");
    expect(Object.keys(normalized?.results ?? {})).toHaveLength(HARDWARE_TEST_CASES.length);
  });

  it("oscura UUID, MAC e device id dai log", () => {
    const labels = [
      "Device id",
      "deviceId",
      "device identifier",
      "peripheral",
      "peripheral id",
      "ID dispositivo",
      "serial",
      "serial number",
      "MAC address",
      "Bluetooth address",
    ];
    const secrets = labels.flatMap((label, labelIndex) => [": ", "=", " "].map(
      (separator, separatorIndex) => `${label}${separator}secret-${labelIndex}-${separatorIndex}`,
    ));
    const redacted = redactDiagnosticMessage(`${secrets.join(", ")} 123e4567-e89b-12d3-a456-426614174000 AA:BB:CC:DD:EE:FF AA-BB-CC-DD-EE-FF`);

    secrets.forEach((secret) => expect(redacted).not.toContain(secret.match(/secret-\d+-\d+/)?.[0]));
    expect(redacted).not.toContain("123e4567");
    expect(redacted).not.toContain("AA:BB");
    expect(redacted).not.toContain("AA-BB");
    expect(redacted).not.toContain("11-22");
    expect(redacted.match(/\[redacted\]/g)).toHaveLength(secrets.length);
    expect(redacted.match(/\[device-id\]/g)).toHaveLength(3);
  });

  it("non altera stati diagnostici ordinari privi di identificatori", () => {
    const messages = [
      "Bluetooth: PoweredOn",
      "Bluetooth: PoweredOff",
      "Bluetooth: Unauthorized",
      "Bluetooth: Resetting",
      "Connessione Bluetooth terminata",
      "Connessione Bluetooth annullata",
      "Nessuna peripheral trovata durante la scansione",
      "Il peripheral è disconnesso",
      "MAC address non disponibile",
      "Bluetooth address unavailable",
      "Device identifier sconosciuto",
      "Errore serial number non disponibile",
    ];

    messages.forEach((message) => {
      expect(redactDiagnosticMessage(message)).toBe(message);
    });
  });

  it("genera un report completo senza identificativo persistente del dispositivo", () => {
    const completed = updateHardwareTestResult(run(), "scan-connect", {
      status: "failed",
      note: "Timeout al primo tentativo | device identifier secret-note-id | MAC address AA-BB-CC-DD-EE-FF",
    }, startedAt + 2_000);
    const report = renderHardwareValidationReport(completed, {
      connectionStatus: "error",
      adapterState: "PoweredOn",
      device: {
        name: "Sonicare4Kids",
        model: "HX6322/04",
        firmware: "1.2.3",
        battery: 80,
      },
      live: {
        handleState: 1,
        isBrushing: false,
        elapsedSeconds: 0,
        routineSeconds: 120,
        mode: "clean",
        intensity: "media",
      },
      recentSessionCount: 120,
      attemptedSessions: 500,
      completedSessions: 480,
      diagnosticLogs: [{
        id: "log-private",
        at: startedAt,
        level: "error",
        message: "Errore su 123e4567-e89b-12d3-a456-426614174000 · Bluetooth address log-secret-id",
      }],
    }, startedAt + 3_000);

    expect(report).toContain("HX6322/04");
    expect(report).toContain("500");
    expect(report).toContain("FALLITO");
    expect(report).toContain("Timeout al primo tentativo \\| device id: [redacted] \\| device id: [redacted]");
    expect(report).not.toContain("secret-note-id");
    expect(report).not.toContain("AA-BB-CC-DD-EE-FF");
    expect(report).not.toContain("log-secret-id");
    expect(report).not.toContain("log-private");
    expect(report).not.toContain("123e4567-e89b-12d3-a456-426614174000");
    expect(report).toContain("[device-id]");
  });
});
