# Appendice A — Test di riproduzione dell'audit indipendente del 30 settembre 2026

Rapporto principale: [`audit-indipendente-2026-09-30.md`](audit-indipendente-2026-09-30.md).

> **Aggiornamento del 6 ottobre 2026.** Nel finto manico la lettura di una caratteristica assente ora fallisce con `errorCode: 404` (`BleErrorCode.CharacteristicNotFound`), come il `BleError` reale di `react-native-ble-plx`; la versione del 30/9 lanciava un `Error` senza codice. Su `main` e sulla PR #7 @ `7d0e305` l'esito non cambia (il client non distingueva il codice), mentre la correzione di C1 nella PR #7 riconosce proprio il 404: con il finto manico precedente F1 risultava fallito anche sul codice corretto. La colonna `6b9632c` riporta gli esiti sul nuovo head della PR #7 con il finto manico aggiornato; la verifica completa è in [`verifica-correzioni-2026-10-06.md`](verifica-correzioni-2026-10-06.md).

Questi file **non fanno parte della suite del prodotto** e non sono stati aggiunti a `tests/`: ogni test afferma il comportamento **corretto**, quindi un test che fallisce indica che il difetto è presente. Dopo le correzioni possono diventare test di regressione.

## Come eseguirli

Da una copia di lavoro del ramo da verificare (con dipendenze installate tramite pnpm 12.5.1):

```bash
mkdir -p tests/__audit__
# copiare in tests/__audit__/ i sei file riportati sotto, poi:
pnpm exec vitest run tests/__audit__
rm -rf tests/__audit__
```

Esito osservato il 30/9/2026 e, per la colonna `6b9632c`, il 6/10/2026 (✗ = test fallito = difetto presente). Con il finto manico aggiornato gli esiti su `a7769e3` e `7d0e305` sono stati riverificati il 6/10 e restano invariati:

| Test | Rilievo | `main` @ `a7769e3` | PR #7 @ `7d0e305` | PR #7 @ `6b9632c` |
|---|---|---|---|---|
| F1a — la prima sync sul GATT Kids reale riesce | C1 | ✗ | ✗ | ✓ |
| F1b — cursore creato e sessione offline importata | C1 | ✗ | ✗ | ✓ |
| F3 — azzeramento timer prima dello stop | M1 | ✗ | ✗ | ✓ |
| F2 — sync che restituisce solo record precedenti | M2 | ✗ | ✗ | ✓ |
| F5a — sessione offline + fallback live (storage web) | M3 | ✓ | ✗ | ✓ |
| F5b — pressione accidentale registrata dal manico | M3 | ✓ | ✗ | ✓ |
| F5c — come F5a sullo storage SQLite nativo | M3 | ✓ | ✗ | ✓ |
| F7 — timer manuale + spazzolata BLE | M4 | ✗ | ✗ | ✓ |
| S3 — codice v2 con aggregati falsificati | S3 | ✗ | ✗ | ✗ |
| S3 controllo — codice v2 genuino accettato | — | ✓ | ✓ | ✓ |
| G1 — sessione demo salvata dallo storage nativo | G1 | ✗ | ✗ | ✓ |

`kids-ble-fake.ts` riproduce la tabella GATT del dump reale HX6340 (firmware 4.2.2) pubblicato in `mtheli/philips_sonicare_ble`, `tests/fixtures/classic_hx6340_kids.json`. `native-reconcile.audit.test.ts` riusa (righe iniziali) il finto database già presente in `tests/brush-storage-native-partial.test.ts`.

## Harness SQLite reale (S1, S2)

> Dal 6 ottobre 2026 l'harness è nel repository come progetto Vitest `native-sqlite` ([`tests/native-sqlite/`](../tests/native-sqlite/README.md)), incluso in `pnpm test`; la descrizione seguente è quella dell'audit.

Per verificare lo storage nativo è stato costruito, nel solo ambiente dell'audit, un harness Vitest che esegue i veri `lib/brush-storage.native.ts` e `lib/complete-backup.native.ts` della PR #7 sostituendo soltanto il modulo nativo di expo-sqlite con un adattatore su `node:sqlite` (il codice JavaScript di expo-sqlite resta quello reale) e expo-file-system con un'implementazione su file system che riproduce il comportamento iOS e Android, AsyncStorage in memoria, condivisione e document picker simulati, più strumenti per simulare riavvii e crash in un punto preciso (`faults.killAt`). Esito sulla PR #7: 17 prove verdi (16 di sanità e autoverifica + il controllo iOS di S1) e una rossa, **S1 in modalità Android**: il restore viene interrotto durante l'inserimento delle sessioni, al riavvio `recoverInterruptedRestore` fallisce con `IllegalArgumentException: URI is not absolute` e lo storico non è più leggibile, mentre lo stesso scenario in modalità iOS torna correttamente allo storico precedente. Limiti dichiarati: nessuna simulazione di perdita di alimentazione, esecuzione seriale delle chiamate native, SQLite 3.51 invece di 3.50. L'harness può essere aggiunto al repository come base per test nativi (S2) se lo si desidera.

## `kids-ble-fake.ts`

```ts
// Fake BLE manager/device modelled on the real HX6340 (Sonicare for Kids, fw 4.2.2)
// GATT capture published in mtheli/philips_sonicare_ble tests/fixtures/classic_hx6340_kids.json.
// Service 0003 exposes ONLY 4100 (read), 40e0 (write), 40d0 (read), 40f0 (read/notify):
// there is NO 40d2 "Session Count" characteristic anywhere on the handle.
import { fromByteArray, toByteArray } from "base64-js";
import { vi } from "vitest";

export const SVC = {
  deviceInfo: "0000180a-0000-1000-8000-00805f9b34fb",
  battery: "0000180f-0000-1000-8000-00805f9b34fb",
  primary: "477ea600-a260-11e4-ae37-0002a5d50001",
  routine: "477ea600-a260-11e4-ae37-0002a5d50002",
  kids: "477ea600-a260-11e4-ae37-0002a5d50003",
};
export const CHR = {
  model: "00002a24-0000-1000-8000-00805f9b34fb",
  firmware: "00002a26-0000-1000-8000-00805f9b34fb",
  battery: "00002a19-0000-1000-8000-00805f9b34fb",
  handleState: "477ea600-a260-11e4-ae37-0002a5d54010",
  handleTime: "477ea600-a260-11e4-ae37-0002a5d54050",
  brushingTime: "477ea600-a260-11e4-ae37-0002a5d54090",
  routineLength: "477ea600-a260-11e4-ae37-0002a5d54091",
  intensity: "477ea600-a260-11e4-ae37-0002a5d540b0",
  sessionId: "477ea600-a260-11e4-ae37-0002a5d54070",
  latestSessionId: "477ea600-a260-11e4-ae37-0002a5d540d0",
  activeSessionId: "477ea600-a260-11e4-ae37-0002a5d540e0",
  sessionData: "477ea600-a260-11e4-ae37-0002a5d54100",
  loaded: "477ea600-a260-11e4-ae37-0002a5d540f0",
};

const b64 = (bytes: number[]) => fromByteArray(Uint8Array.from(bytes));
const u16 = (v: number) => [v & 0xff, (v >> 8) & 0xff];
const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

export type KidsRecord = { stamp: number; duration: number; target: number };

class Sub { remove = vi.fn(); }

function characteristicNotFound(characteristic: string): Error & { errorCode: number } {
  return Object.assign(new Error(`Characteristic ${characteristic} not found`), { errorCode: 404 });
}

export class FakeKidsDevice {
  id = "24:E5:AA:00:00:02";
  name = "Sonicare4Kids";
  localName = "Sonicare4Kids";
  serviceUUIDs = [SVC.primary];
  handleClock = 26_500_000;
  handleState = 1;
  records = new Map<number, KidsRecord>();
  selected: number | null = null;
  monitors = new Map<string, (error: Error | null, value: { value: string } | null) => void>();
  disconnected: ((error: Error | null) => void) | null = null;
  cancelConnection = vi.fn(async () => this);
  connect = vi.fn(async () => this);
  discoverAllServicesAndCharacteristics = vi.fn(async () => this);
  services = vi.fn(async () => Object.values(SVC).map((uuid) => ({ uuid })));

  latest(): number { return Math.max(0, ...this.records.keys()); }

  // Real GATT table: characteristic -> [service, reader]
  private table(): Record<string, [string, () => number[]]> {
    return {
      [CHR.model]: [SVC.deviceInfo, () => [..."HX6340   "].map((c) => c.charCodeAt(0))],
      [CHR.firmware]: [SVC.deviceInfo, () => [..."4.2.2"].map((c) => c.charCodeAt(0))],
      [CHR.battery]: [SVC.battery, () => [80]],
      [CHR.handleState]: [SVC.primary, () => [this.handleState]],
      [CHR.handleTime]: [SVC.primary, () => u32(this.handleClock)],
      [CHR.brushingTime]: [SVC.routine, () => u16(0)],
      [CHR.routineLength]: [SVC.routine, () => u16(120)],
      [CHR.intensity]: [SVC.routine, () => [1]],
      [CHR.sessionId]: [SVC.routine, () => u16(this.latest() + 1)],
      [CHR.latestSessionId]: [SVC.kids, () => u16(this.latest())],
      [CHR.loaded]: [SVC.kids, () => u16(this.selected ?? 0)],
      [CHR.sessionData]: [SVC.kids, () => {
        const record = this.selected === null ? undefined : this.records.get(this.selected);
        if (!record || this.selected === null) return new Array(16).fill(0);
        return [...u32(record.stamp), ...u16(this.selected), ...u16(record.duration), ...u16(record.target), 0, 1, 0, 0, 0, 0];
      }],
    };
  }

  readCharacteristicForService = vi.fn(async (service: string, characteristic: string) => {
    const entry = this.table()[characteristic];
    if (!entry || entry[0] !== service) {
      // react-native-ble-plx rejects with BleError "Characteristic <uuid> not found",
      // errorCode 404 (BleErrorCode.CharacteristicNotFound)
      throw characteristicNotFound(characteristic);
    }
    return { value: b64(entry[1]()) };
  });

  writeCharacteristicWithResponseForService = vi.fn(async (service: string, characteristic: string, value: string) => {
    if (service !== SVC.kids || characteristic !== CHR.activeSessionId) throw characteristicNotFound(characteristic);
    const bytes = toByteArray(value);
    this.selected = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
    return {};
  });

  monitorCharacteristicForService(_service: string, characteristic: string, callback: (error: Error | null, value: { value: string } | null) => void) {
    this.monitors.set(characteristic, callback);
    return new Sub();
  }

  onDisconnected(callback: (error: Error | null) => void) {
    this.disconnected = callback;
    return new Sub();
  }

  notify(characteristic: string, bytes: number[]) {
    this.monitors.get(characteristic)?.(null, { value: b64(bytes) });
  }

  /** Brushes live while connected: state=2, timer 1..seconds, then stop. */
  brushLive(seconds: number, options: { wipeTimerBeforeStop?: boolean } = {}) {
    this.handleState = 2;
    this.notify(CHR.handleState, [2]);
    for (let s = 1; s <= seconds; s += 1) this.notify(CHR.brushingTime, u16(s));
    if (options.wipeTimerBeforeStop) this.notify(CHR.brushingTime, u16(0));
    this.handleState = 1;
    this.notify(CHR.handleState, [1]);
    if (!options.wipeTimerBeforeStop) this.notify(CHR.brushingTime, u16(0));
  }

  /** Files a record on the handle (as the Kids handle does on the next connection). */
  file(sessionId: number, record: KidsRecord) { this.records.set(sessionId, record); }
}

export class FakeKidsManager {
  constructor(public device: FakeKidsDevice) {}
  stopDeviceScan = vi.fn();
  cancelTransaction = vi.fn(async () => undefined);
  destroy = vi.fn();
  onStateChange = vi.fn((callback: (state: string) => void) => { callback("PoweredOn"); return new Sub(); });
  startDeviceScan = vi.fn((_uuids: unknown, _options: unknown, callback: (e: Error | null, d: FakeKidsDevice) => void) => {
    callback(null, this.device);
  });
}
```

## `ble-flow.audit.test.tsx`

```tsx
// Independent audit 2026-09-30 — reproduction tests (not part of the product suite).
// They exercise the REAL NativeSonicareClient + BrushProvider + (web) storage logic.
// Every test asserts the CORRECT behaviour: a failing test means the defect is present.
import React, { act } from "react";
import { fromByteArray } from "base64-js";
import { describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => { memory.set(key, value); },
    removeItem: async (key: string) => { memory.delete(key); },
    multiRemove: async (keys: string[]) => { keys.forEach((key) => memory.delete(key)); },
    multiGet: async (keys: string[]) => keys.map((key) => [key, memory.get(key) ?? null]),
    getAllKeys: async () => [...memory.keys()],
  },
}));
vi.mock("react-native", () => ({
  Platform: { OS: "ios", Version: "18" },
  PermissionsAndroid: { PERMISSIONS: {}, RESULTS: { GRANTED: "granted" }, request: vi.fn(), requestMultiple: vi.fn() },
}));
vi.mock("react-native-ble-plx", () => ({ BleManager: class {} }));
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  NotificationFeedbackType: { Success: "success" },
  impactAsync: vi.fn(async () => undefined),
  notificationAsync: vi.fn(async () => undefined),
}));

import type { BleClientEvents, BrushLiveData, SonicareClient, StoredDeviceSession } from "@/lib/brush-types";
import { DEFAULT_LIVE_DATA } from "@/lib/brush-types";
import { NativeSonicareClient } from "@/lib/sonicare-client.native";
import { BrushProvider, useBrush } from "@/contexts/brush-context";
import { saveDeviceSessionsWithLifetime } from "@/lib/brush-storage";
import { CHR, FakeKidsDevice, FakeKidsManager, SVC } from "./kids-ble-fake";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type BrushValue = ReturnType<typeof useBrush>;
const box: { value: BrushValue | null } = { value: null };
function Probe() { box.value = useBrush(); return null; }
const current = () => { if (!box.value) throw new Error("provider not rendered"); return box.value; };

async function render(element: React.ReactElement): Promise<() => Promise<void>> {
  // PR #7 uses `test-renderer`; main still ships `react-test-renderer`.
  let modern: { createRoot: () => { render: (e: React.ReactElement) => void; unmount: () => void } } | null = null;
  try {
    modern = await import("test-renderer" as string);
  } catch {
    modern = null;
  }
  if (modern) {
    const root = modern.createRoot();
    await act(async () => { root.render(element); });
    return async () => act(async () => root.unmount());
  }
  const legacy = await import("react-test-renderer" as string);
  let instance: { unmount: () => void } | null = null;
  await act(async () => { instance = legacy.create(element); });
  return async () => act(async () => instance?.unmount());
}

async function settle(ms = 30) {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, ms / 10));
  });
}

const kidsRecord = (stamp: number) => ({ stamp, duration: 120, target: 120 });

describe("AUDIT F1 — real HX63xx Kids GATT (no Session Count 40d2)", () => {
  it("F1a: the first sync on the real Kids GATT succeeds (records are readable)", async () => {
    const device = new FakeKidsDevice();
    for (let id = 280; id <= 286; id += 1) device.file(id, kidsRecord(26_400_000 + id * 3_600));
    const events: BleClientEvents = {
      onAdapterState: vi.fn(), onStatus: vi.fn(), onDevice: vi.fn(), onLiveData: vi.fn(), onLog: vi.fn(),
    };
    const client = new NativeSonicareClient(events, new FakeKidsManager(device) as never);
    await client.scanAndConnect();

    // The records are there and readable with the documented select-then-read exchange ...
    await device.writeCharacteristicWithResponseForService(SVC.kids, CHR.activeSessionId, fromByteArray(Uint8Array.from([286 & 0xff, 286 >> 8])));
    const raw = await device.readCharacteristicForService(SVC.kids, CHR.sessionData);
    expect(raw.value).not.toBe(fromByteArray(new Uint8Array(16)));
    // ... so the first sync must not fail just because 40d2 does not exist on this handle.
    await expect(client.syncStoredSessionsSince(null)).resolves.toBeInstanceOf(Array);
    client.destroy();
  });

  it("F1b: end-to-end, a cursor is created and a session brushed without the app is imported", async () => {
    memory.clear();
    const device = new FakeKidsDevice();
    device.file(286, kidsRecord(26_400_000));
    const factory = (events: BleClientEvents) => new NativeSonicareClient(events, new FakeKidsManager(device) as never);
    const unmount = await render(<BrushProvider clientFactory={factory} syncDelayMs={0}><Probe /></BrushProvider>);
    await settle();
    await act(async () => { await current().connect(); });
    expect(current().status).toBe("connected");

    await act(async () => { device.brushLive(120); });   // brushed with the app open
    await settle(200);
    device.file(287, kidsRecord(26_490_000));              // the handle files it later
    device.file(288, kidsRecord(26_495_000));              // + one session brushed without the app
    await act(async () => { await current().syncLatest(); });
    await settle(200);

    expect(Object.keys(current().lifetimeProgress.deviceCursors)).not.toEqual([]);
    expect(current().realHistory.some((session) => session.deviceSessionId === 288)).toBe(true);
    await unmount();
  });
});

describe("AUDIT F3 — timer reset notified before the stop", () => {
  it("F3: brushing-time=0 notified before handle-state=standby still records the 120 s session", async () => {
    memory.clear();
    const device = new FakeKidsDevice();
    const factory = (events: BleClientEvents) => new NativeSonicareClient(events, new FakeKidsManager(device) as never);
    const unmount = await render(<BrushProvider clientFactory={factory} syncDelayMs={0}><Probe /></BrushProvider>);
    await settle();
    await act(async () => { await current().connect(); });
    const readsBefore = device.readCharacteristicForService.mock.calls.length;

    await act(async () => { device.brushLive(120, { wipeTimerBeforeStop: true }); });
    await settle(200);

    void readsBefore;
    expect(current().realHistory).toHaveLength(1);
    await unmount();
  });
});

describe("AUDIT F2 — sync at stop returns only older records", () => {
  it("F2: with a working cursor, session B is kept when the sync at its stop returns only A's record", async () => {
    memory.clear();
    const t0 = Date.now() - 6 * 3_600_000;
    await saveDeviceSessionsWithLifetime("kids-brush", [{
      sessionId: 41, startedAt: t0, timeConfidence: "reconstructed",
      durationSeconds: 120, targetSeconds: 120, mode: "clean", intensity: "media",
    }]);

    const script: Array<() => StoredDeviceSession[]> = [];
    let fake: (SonicareClient & { events: BleClientEvents }) | null = null;
    const factory = (events: BleClientEvents) => {
      fake = {
        events,
        initialize: vi.fn(async () => undefined),
        scanAndConnect: vi.fn(async () => undefined),
        disconnect: vi.fn(async () => undefined),
        destroy: vi.fn(),
        syncStoredSessionsSince: vi.fn(async () => (script.shift() ?? (() => []))()),
      };
      return fake;
    };
    const unmount = await render(<BrushProvider clientFactory={factory} syncDelayMs={0}><Probe /></BrushProvider>);
    await settle();
    const live = (patch: Partial<BrushLiveData>) => act(async () => { fake!.events.onLiveData({ ...DEFAULT_LIVE_DATA, ...patch }); });
    await act(async () => {
      fake!.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
      fake!.events.onStatus("connected");
    });

    // Session A (id 42): the Kids handle has not filed it yet -> [] -> live fallback.
    script.push(() => []);
    await live({ isBrushing: true, elapsedSeconds: 120, handleState: 2 });
    await live({ isBrushing: false, elapsedSeconds: 0, handleState: 1 });
    await settle(100);
    expect(current().realHistory).toHaveLength(2);
    const fallbackA = current().realHistory.find((session) => session.id.startsWith("ble-live:"))!;

    // Session B (id 43): at its stop the handle only exposes A's record (42).
    script.push(() => [{
      sessionId: 42, startedAt: fallbackA.startedAt, timeConfidence: "reconstructed",
      durationSeconds: 120, targetSeconds: 120, mode: "clean", intensity: "media",
    }]);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await live({ isBrushing: true, elapsedSeconds: 118, handleState: 2 });
    await live({ isBrushing: false, elapsedSeconds: 0, handleState: 1 });
    await settle(100);

    const history = current().realHistory;
    // 41 (seed) + 42 (A, reconciled) + B (118 s, live fallback until its record is filed)
    expect(history).toHaveLength(3);
    expect(history.some((session) => session.durationSeconds === 118)).toBe(true);
    await unmount();
  });
});

describe("AUDIT F7 — manual timer and BLE brushing overlap", () => {
  it("F7: one physical brushing with the manual timer already running is credited once", async () => {
    memory.clear();
    let now = new Date(2026, 8, 29, 20, 0, 0).getTime();
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    let fake: (SonicareClient & { events: BleClientEvents }) | null = null;
    const factory = (events: BleClientEvents) => {
      fake = {
        events,
        initialize: vi.fn(async () => undefined),
        scanAndConnect: vi.fn(async () => undefined),
        disconnect: vi.fn(async () => undefined),
        destroy: vi.fn(),
        syncStoredSessionsSince: vi.fn(async () => []),
      };
      return fake;
    };
    const unmount = await render(<BrushProvider clientFactory={factory} syncDelayMs={0}><Probe /></BrushProvider>);
    await settle();
    await act(async () => {
      fake!.events.onDevice({ id: "kids-brush", name: "Sonicare4Kids", model: "HX6322/04" });
      fake!.events.onStatus("connected");
    });

    await act(async () => { current().startManual(); });         // parent starts the in-app timer
    now += 2_000;
    await act(async () => { fake!.events.onLiveData({ ...DEFAULT_LIVE_DATA, isBrushing: true, elapsedSeconds: 118, handleState: 2 }); });
    now += 118_000;
    await act(async () => { fake!.events.onLiveData({ ...DEFAULT_LIVE_DATA, isBrushing: false, elapsedSeconds: 0, handleState: 1 }); });
    await settle(100);
    await act(async () => { await current().stopManual(); });
    await settle(100);

    expect(current().lifetimeProgress.completedSessions).toBe(1);
    nowSpy.mockRestore();
    await unmount();
  });
});
```

## `reconcile.audit.test.ts`

```ts
// Independent audit 2026-09-30 — reconciliation probes on the shared lifetime/fallback logic
// (web storage implementation, same lifetime-progress functions used by the SQLite storage).
// Every test asserts the CORRECT behaviour: a failing test means the defect is present.
import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => { memory.set(key, value); },
    removeItem: async (key: string) => { memory.delete(key); },
    multiRemove: async (keys: string[]) => { keys.forEach((key) => memory.delete(key)); },
    multiGet: async (keys: string[]) => keys.map((key) => [key, memory.get(key) ?? null]),
    getAllKeys: async () => [...memory.keys()],
  },
}));

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import {
  loadHistoryBundle,
  saveDeviceFallbackWithLifetime,
  saveDeviceSessionsWithLifetime,
} from "@/lib/brush-storage";

const DEVICE = "24:E5:AA:00:00:02";
const HOUR = 3_600_000;

function record(sessionId: number, startedAt: number, durationSeconds = 120): StoredDeviceSession {
  return { sessionId, startedAt, timeConfidence: "reconstructed", durationSeconds, targetSeconds: 120, mode: "clean", intensity: "media" };
}
function fallback(startedAt: number, durationSeconds = 120): BrushSession {
  return {
    id: `ble-live:${DEVICE}:${startedAt}`, startedAt, rewardPolicy: "completed-only",
    durationSeconds, targetSeconds: 120, completed: durationSeconds >= 108, source: "device",
  };
}

describe("AUDIT F5 — fallback reconciliation when the handle counter is ahead of the app's expectation", () => {
  beforeEach(() => memory.clear());

  it("F5a: offline session (42) then live session with fallback (43): the live brushing is counted once", async () => {
    const t0 = new Date(2026, 8, 28, 8, 0, 0).getTime();
    await saveDeviceSessionsWithLifetime(DEVICE, [record(41, t0 - 24 * HOUR)]);     // cursor = 41
    // Morning: brushed WITHOUT the app -> the handle stores record 42 (not seen yet).
    // Evening: brushed WITH the app; the Kids handle files the record late -> live fallback.
    const evening = t0 + 12 * HOUR;
    await saveDeviceFallbackWithLifetime(DEVICE, fallback(evening));
    // Next sync returns both records, with accurately reconstructed start times.
    const result = await saveDeviceSessionsWithLifetime(DEVICE, [record(42, t0), record(43, evening)]);

    const bundle = await loadHistoryBundle();
    // Physical brushings: 41, morning(42), evening(43) => 3 attempts, 3 completions.
    expect({
      attempted: result.lifetimeProgress.attemptedSessions,
      completed: result.lifetimeProgress.completedSessions,
      xp: result.lifetimeProgress.xp,
      rows: bundle.recentHistory.length,
    }).toEqual({ attempted: 3, completed: 3, xp: 180, rows: 3 });
  });

  it("F5b: an accidental 2 s press recorded by the handle (42) shifts the chain: the live brushing (43) is counted once", async () => {
    const t0 = new Date(2026, 8, 28, 20, 0, 0).getTime();
    await saveDeviceSessionsWithLifetime(DEVICE, [record(41, t0 - 24 * HOUR)]);     // cursor = 41
    await saveDeviceFallbackWithLifetime(DEVICE, fallback(t0));                      // app ignores < 5 s presses
    const result = await saveDeviceSessionsWithLifetime(DEVICE, [record(42, t0 - 60_000, 2), record(43, t0)]);

    expect({
      attempted: result.lifetimeProgress.attemptedSessions,
      completed: result.lifetimeProgress.completedSessions,
    }).toEqual({ attempted: 3, completed: 2 });
  });
});
```

## `native-reconcile.audit.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrushSession, StoredDeviceSession } from "@/lib/brush-types";
import {
  applySessionToLifetime,
  createLifetimeProgress,
  deviceKey,
  markPendingDeviceFallback,
} from "@/lib/lifetime-progress";

const nativeState = vi.hoisted(() => ({
  metadata: new Map<string, string>(),
  sessions: [] as Array<{
    id: string;
    started_at: number;
    time_confidence: string;
    reward_policy: string;
    duration_seconds: number;
    target_seconds: number;
    completed: number;
    source: "manual" | "device";
    device_session_id: number | null;
  }>,
  ledgerSessionIds: [] as string[],
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
    multiRemove: vi.fn(async () => undefined),
  },
}));

vi.mock("expo-file-system", () => ({
  Directory: class {
    exists = false;
    list() { return []; }
  },
  File: class {
    exists = false;
  },
  Paths: { cache: "file:///cache" },
}));

const fakeDatabase = {
  execAsync: vi.fn(async () => undefined),
  closeAsync: vi.fn(async () => undefined),
  withExclusiveTransactionAsync: vi.fn(async (operation: (database: typeof fakeDatabase) => Promise<void>) => {
    await operation(fakeDatabase);
  }),
  getAllAsync: vi.fn(async (sql: string) => {
    if (sql.startsWith("PRAGMA table_info(sessions)")) {
      return [{ name: "time_confidence" }, { name: "reward_policy" }];
    }
    if (sql.includes("ORDER BY started_at DESC")) {
      return [...nativeState.sessions]
        .sort((first, second) => second.started_at - first.started_at || second.id.localeCompare(first.id))
        .slice(0, 120);
    }
    if (sql.includes("ORDER BY started_at ASC")) {
      return [...nativeState.sessions]
        .sort((first, second) => first.started_at - second.started_at || first.id.localeCompare(second.id));
    }
    return [];
  }),
  getEachAsync: vi.fn(() => ({
    async *[Symbol.asyncIterator]() {
      for (const row of [...nativeState.sessions].sort((first, second) => (
        first.started_at - second.started_at || first.id.localeCompare(second.id)
      ))) yield row;
    },
  })),
  getFirstAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.includes("COUNT(*) AS count FROM sessions")) return { count: nativeState.sessions.length };
    if (sql.includes("MAX(started_at) AS max_started_at")) {
      return {
        max_started_at: nativeState.sessions.length
          ? Math.max(...nativeState.sessions.map((session) => session.started_at))
          : null,
      };
    }
    if (sql.includes("FROM metadata WHERE key = ?")) {
      const value = nativeState.metadata.get(String(args[0]));
      return value === undefined ? null : { value };
    }
    return null;
  }),
  runAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
    if (sql.startsWith("DELETE FROM reward_ledger WHERE session_id = ?")) {
      nativeState.ledgerSessionIds = nativeState.ledgerSessionIds.filter((id) => id !== args[0]);
      return { changes: 1 };
    }
    if (sql.startsWith("DELETE FROM sessions WHERE id = ?")) {
      const before = nativeState.sessions.length;
      nativeState.sessions = nativeState.sessions.filter((session) => session.id !== args[0]);
      return { changes: before - nativeState.sessions.length };
    }
    if (sql.includes("INSERT OR IGNORE INTO sessions")) {
      const id = String(args[0]);
      if (nativeState.sessions.some((session) => session.id === id)) return { changes: 0 };
      nativeState.sessions.push({
        id,
        started_at: Number(args[1]),
        time_confidence: String(args[2]),
        reward_policy: String(args[3]),
        duration_seconds: Number(args[4]),
        target_seconds: Number(args[5]),
        completed: Number(args[6]),
        source: args[7] as "manual" | "device",
        device_session_id: args[8] === null ? null : Number(args[8]),
      });
      return { changes: 1 };
    }
    if (sql.includes("INSERT OR IGNORE INTO reward_ledger")) {
      nativeState.ledgerSessionIds.push(String(args[1]));
      return { changes: 1 };
    }
    if (sql.includes("INSERT INTO metadata")) {
      const key = String(args[0]);
      const value = args.length > 1 ? String(args[1]) : "true";
      nativeState.metadata.set(key, value);
      return { changes: 1 };
    }
    if (sql === "DELETE FROM reward_ledger") {
      nativeState.ledgerSessionIds = [];
      return { changes: 1 };
    }
    return { changes: 0 };
  }),
};

vi.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "file:///sqlite",
  openDatabaseAsync: vi.fn(async () => fakeDatabase),
  backupDatabaseAsync: vi.fn(async () => undefined),
  deleteDatabaseAsync: vi.fn(async () => undefined),
}));

// ---- AUDIT F5 on the NATIVE SQLite storage (fake DB copied from the project's own native test) ----
const DEVICE = "24:E5:AA:00:00:02";
const HOUR = 3_600_000;
function record(sessionId: number, startedAt: number, durationSeconds = 120): StoredDeviceSession {
  return { sessionId, startedAt, timeConfidence: "reconstructed", durationSeconds, targetSeconds: 120, mode: "clean", intensity: "media" };
}
function fallback(startedAt: number): BrushSession {
  return { id: `ble-live:${DEVICE}:${startedAt}`, startedAt, rewardPolicy: "completed-only", durationSeconds: 120, targetSeconds: 120, completed: true, source: "device" };
}

describe("AUDIT F5 native — offline record before the fallback's own record", () => {
  beforeEach(() => {
    nativeState.metadata.clear();
    nativeState.sessions = [];
    nativeState.ledgerSessionIds = [];
    vi.resetModules();
  });

  it("F5c (native SQLite storage): counts the live brushing once (attempted 3, completed 3)", async () => {
    const { saveDeviceSessionsWithLifetime, saveDeviceFallbackWithLifetime } = await import("@/lib/brush-storage.native");
    const t0 = new Date(2026, 8, 28, 8).getTime();
    await saveDeviceSessionsWithLifetime(DEVICE, [record(41, t0 - 24 * HOUR)]);
    const evening = t0 + 12 * HOUR;
    await saveDeviceFallbackWithLifetime(DEVICE, fallback(evening));
    const result = await saveDeviceSessionsWithLifetime(DEVICE, [record(42, t0), record(43, evening)]);
    expect({
      attempted: result.lifetimeProgress.attemptedSessions,
      completed: result.lifetimeProgress.completedSessions,
      rows: nativeState.sessions.length,
    }).toEqual({ attempted: 3, completed: 3, rows: 3 });
  });
});
```

## `legacy-code.audit.test.ts`

```ts
// Independent audit 2026-09-30 — the textual v2 backup code bypasses the semantic validation of v3 files.
// The test asserts the CORRECT behaviour: a failing test means the defect is present.
import { describe, expect, it } from "vitest";

import { BACKUP_PREFIX, parseBackup } from "@/lib/backup";
import { createLifetimeProgress } from "@/lib/lifetime-progress";

describe("AUDIT S3 — legacy v2 backup code", () => {
  it("S3: rejects lifetime aggregates that the archived history cannot justify", () => {
    const session = {
      id: "manual-1", startedAt: new Date(2026, 8, 20, 8).getTime(), durationSeconds: 120,
      targetSeconds: 120, completed: true, source: "manual" as const,
    };
    const forged = {
      ...createLifetimeProgress([session]),
      attemptedSessions: 500, completedSessions: 500, xp: 30_000,
      perfectDays: 200, currentStreakDays: 180, longestStreakDays: 180,
    };
    const code = BACKUP_PREFIX + JSON.stringify({
      format: "brushlings-backup", version: 2, createdAt: Date.now(),
      profile: { selectedId: "bloopi", hasChosenStarter: true },
      customization: { ownedIds: ["bubble-room"], equippedHabitatId: "bubble-room" },
      history: [session],
      lifetimeProgress: forged,
    });
    let accepted: ReturnType<typeof parseBackup> | null = null;
    try { accepted = parseBackup(code); } catch { accepted = null; }
    expect(accepted?.lifetimeProgress.completedSessions ?? 0).not.toBe(500);
  });
});

describe("AUDIT S3 — control: a genuine code still parses", () => {
  it("control: parseBackup accepts a well-formed genuine code", () => {
    const session = {
      id: "manual-1", startedAt: new Date(2026, 8, 20, 8).getTime(), durationSeconds: 120,
      targetSeconds: 120, completed: true, source: "manual" as const,
    };
    const code = BACKUP_PREFIX + JSON.stringify({
      format: "brushlings-backup", version: 2, createdAt: Date.now(),
      profile: { selectedId: "bloopi", hasChosenStarter: true },
      customization: { ownedIds: ["bubble-room"], equippedHabitatId: "bubble-room" },
      history: [session],
      lifetimeProgress: createLifetimeProgress([session]),
    });
    expect(parseBackup(code).lifetimeProgress.completedSessions).toBe(1);
  });
});
```

## `native-demo.audit.test.ts`

```ts
// Independent audit 2026-09-30 — demo mode on the NATIVE storage (lib/brush-storage.native.ts).
// The test asserts the CORRECT behaviour: a failing test means the defect is present.
import { describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => { memory.set(key, value); },
    removeItem: async (key: string) => { memory.delete(key); },
    multiRemove: async (keys: string[]) => { keys.forEach((key) => memory.delete(key)); },
  },
}));
vi.mock("expo-file-system", () => ({ Directory: class {}, File: class {}, Paths: { cache: "file:///cache" } }));
vi.mock("expo-sqlite", () => ({
  defaultDatabaseDirectory: "/sqlite",
  openDatabaseAsync: vi.fn(async () => { throw new Error("SQLite is not used by the demo storage"); }),
  backupDatabaseAsync: vi.fn(), deleteDatabaseAsync: vi.fn(),
}));

import type { BrushSession } from "@/lib/brush-types";

describe("AUDIT G1 — demo mode on iOS/Android storage", () => {
  it("G1: a saved demo session is kept in the demo history", async () => {
    const { saveDemoSession, loadDemoHistory, replaceDemoHistory } = await import("@/lib/brush-storage.native");
    const demo: BrushSession = {
      id: "demo-20260930-morning", startedAt: new Date(2026, 8, 30, 8).getTime(), rewardPolicy: "completed-only",
      durationSeconds: 120, targetSeconds: 120, completed: true, source: "demo",
    };
    const afterSave = await saveDemoSession(demo);
    const afterWeek = await replaceDemoHistory([demo, { ...demo, id: "demo-20260930-evening", startedAt: demo.startedAt + 12 * 3_600_000 }]);
    const reloaded = await loadDemoHistory();
    expect({ afterSave: afterSave.length, afterWeek: afterWeek.length, reloaded: reloaded.length })
      .toEqual({ afterSave: 1, afterWeek: 2, reloaded: 2 });
  });
});
```
