import { fromByteArray, toByteArray } from "base64-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "ios", Version: "18" },
  PermissionsAndroid: {
    PERMISSIONS: { BLUETOOTH_SCAN: "scan", BLUETOOTH_CONNECT: "connect", ACCESS_FINE_LOCATION: "location" },
    RESULTS: { GRANTED: "granted" },
    request: vi.fn(),
    requestMultiple: vi.fn(),
  },
}));
vi.mock("react-native-ble-plx", () => ({ BleManager: class {} }));

import { Platform } from "react-native";

import type { BleClientEvents, ToothbrushDevice } from "@/lib/brush-types";
import { NativeSonicareClient } from "@/lib/sonicare-client.native";
import { SONICARE } from "@/lib/sonicare-uuids";

function b64(bytes: number[]) {
  return fromByteArray(Uint8Array.from(bytes));
}

function uint16Bytes(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function uint32Bytes(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function sessionPayload(handleTimestamp: number, sessionId: number, duration = 120): number[] {
  return [
    ...uint32Bytes(handleTimestamp),
    ...uint16Bytes(sessionId),
    ...uint16Bytes(duration),
    ...uint16Bytes(120),
    0,
    1,
    0,
    0,
  ];
}

function missingSessionCountError(): Error & { errorCode: number } {
  return Object.assign(new Error("CharacteristicNotFound: sessionCount"), { errorCode: 404 });
}

class FakeSubscription {
  remove = vi.fn();
}

class FakeDevice {
  id = "kids-brush";
  name = "Sonicare4Kids";
  localName = "Sonicare4Kids";
  serviceUUIDs = [SONICARE.services.primary];
  monitors = new Map<string, (error: Error | null, value: { value: string } | null) => void>();
  monitorSubscriptions: FakeSubscription[] = [];
  disconnectSubscription = new FakeSubscription();
  disconnectedCallback: ((error: Error | null) => void) | null = null;
  cancelConnection = vi.fn(async () => this);
  connect = vi.fn(async () => this);
  discoverAllServicesAndCharacteristics = vi.fn(async () => this);
  services = vi.fn(async () => []);
  writeCharacteristicWithResponseForService = vi.fn(async (
    _service: string,
    _characteristic: string,
    _value: string,
    _transactionId?: string,
  ) => ({}));

  readCharacteristicForService = vi.fn(async (_service: string, characteristic: string) => {
    if (characteristic === SONICARE.characteristics.modelNumber) return { value: b64([..."HX6340"].map((c) => c.charCodeAt(0))) };
    if (characteristic === SONICARE.characteristics.firmwareRevision) return { value: b64([..."1.2.3"].map((c) => c.charCodeAt(0))) };
    if (characteristic === SONICARE.characteristics.batteryLevel) return { value: b64([80]) };
    if (characteristic === SONICARE.characteristics.routineLength) return { value: b64([120, 0]) };
    if (characteristic === SONICARE.characteristics.brushingTime) return { value: b64([0, 0]) };
    return { value: b64([1]) };
  });

  monitorCharacteristicForService(_service: string, characteristic: string, callback: (error: Error | null, value: { value: string } | null) => void) {
    const subscription = new FakeSubscription();
    this.monitors.set(characteristic, callback);
    this.monitorSubscriptions.push(subscription);
    return subscription;
  }

  onDisconnected(callback: (error: Error | null) => void) {
    this.disconnectedCallback = callback;
    return this.disconnectSubscription;
  }
}

function configureStoredSessions(
  device: FakeDevice,
  input: {
    latest: number;
    count: number;
    handleTime: number;
    recordTimes: Record<number, number>;
    recordIds?: Record<number, number>;
    countError?: Error;
    countPayload?: number[];
    countBase64?: string;
  },
) {
  let selected = input.latest;
  device.writeCharacteristicWithResponseForService.mockImplementation(
    async (_service: string, characteristic: string, value: string) => {
      if (characteristic === SONICARE.characteristics.activeSessionId) {
        const bytes = toByteArray(value);
        selected = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
      }
      return {};
    },
  );
  device.readCharacteristicForService.mockImplementation(async (_service: string, characteristic: string) => {
    if (characteristic === SONICARE.characteristics.latestSessionId) {
      return { value: b64(uint16Bytes(input.latest)) };
    }
    if (characteristic === SONICARE.characteristics.sessionCount) {
      if (input.countError) throw input.countError;
      return { value: input.countBase64 ?? b64(input.countPayload ?? uint16Bytes(input.count)) };
    }
    if (characteristic === SONICARE.characteristics.handleTime) {
      return { value: b64(uint32Bytes(input.handleTime)) };
    }
    if (characteristic === SONICARE.characteristics.sessionData) {
      return {
        value: b64(sessionPayload(
          input.recordTimes[selected] ?? 0,
          input.recordIds?.[selected] ?? selected,
        )),
      };
    }
    return { value: b64([1]) };
  });
}

class FakeManager {
  devices: FakeDevice[] = [];
  failServicesCount = 0;
  autoScanResult = true;
  // When set, the scan reports these peripherals in order instead of a fresh Kids handle.
  scanDevices: FakeDevice[] | null = null;
  // When set, the scan fails immediately with this react-native-ble-plx error.
  scanError: (Error & { errorCode?: number }) | null = null;
  deferConnect = false;
  releaseConnect: (() => void) | null = null;
  adapterState = "PoweredOn";
  adapterSubscription = new FakeSubscription();
  stateListeners: ((state: string) => void)[] = [];
  stateSubscriptions: FakeSubscription[] = [];
  stopDeviceScan = vi.fn();
  cancelTransaction = vi.fn(async () => undefined);
  destroy = vi.fn();
  // Like react-native-ble-plx: one subscription per listener, current state on request.
  onStateChange = vi.fn((callback: (state: string) => void, emitCurrentState?: boolean) => {
    const subscription = this.stateSubscriptions.length === 0
      ? this.adapterSubscription
      : new FakeSubscription();
    this.stateSubscriptions.push(subscription);
    this.stateListeners.push(callback);
    if (emitCurrentState) callback(this.adapterState);
    return subscription;
  });
  emitState(state: string) {
    this.adapterState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }
  startDeviceScan = vi.fn((_uuids, _options, callback) => {
    if (this.scanError) {
      callback(this.scanError, null);
      return;
    }
    if (this.scanDevices) {
      for (const advertised of this.scanDevices) {
        this.devices.push(advertised);
        callback(null, advertised);
      }
      return;
    }
    const device = new FakeDevice();
    if (this.failServicesCount > 0) {
      this.failServicesCount -= 1;
      device.services.mockRejectedValueOnce(new Error("GATT services failed"));
    }
    if (this.deferConnect) {
      device.connect.mockImplementation(() => new Promise((resolve) => {
        this.releaseConnect = () => resolve(device);
      }));
    }
    this.devices.push(device);
    if (this.autoScanResult) callback(null, device);
  });
}

function createEvents() {
  const deviceUpdates: (ToothbrushDevice | null)[] = [];
  const events: BleClientEvents = {
    onAdapterState: vi.fn(),
    onStatus: vi.fn(),
    onDevice: vi.fn((device) => deviceUpdates.push(device)),
    onLiveData: vi.fn(),
    onLog: vi.fn(),
  };
  return { events, deviceUpdates };
}

describe("NativeSonicareClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("attende advertising Kids lento ma chiude la scansione dopo 45 secondi", async () => {
    vi.useFakeTimers();
    const manager = new FakeManager();
    manager.autoScanResult = false;
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    const operation = client.scanAndConnect();
    // Attach the rejection handler immediately to avoid an unhandled rejection.
    const result = operation.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(manager.stopDeviceScan).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(15_000);
    const error = await result;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Spazzolino non trovato");
    expect(manager.stopDeviceScan).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("preserva modello riportato e firmware quando arriva una notifica batteria", async () => {
    const manager = new FakeManager();
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();

    const device = manager.devices[0];
    device.monitors.get(SONICARE.characteristics.batteryLevel)?.(null, { value: b64([42]) });
    const last = deviceUpdates.at(-1);
    expect(last).toMatchObject({ model: "HX6340", firmware: "1.2.3", battery: 42 });
  });

  it("legge in via sperimentale il tempo motore e il quadrante del manico (lotto 11)", async () => {
    const manager = new FakeManager();
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    const device = manager.devices[0];
    // The default fake answers a single byte: too short for the 32-bit motor time, so it is unknown.
    expect(deviceUpdates.at(-1)?.motorRuntimeSeconds).toBeUndefined();
    device.monitors.get(SONICARE.characteristics.quadPacer)?.(null, { value: b64([2]) });
    expect(vi.mocked(events.onLiveData).mock.calls.at(-1)?.[0]).toMatchObject({ quadrant: 2 });
    device.monitors.get(SONICARE.characteristics.quadPacer)?.(null, { value: b64([9]) });
    expect(vi.mocked(events.onLiveData).mock.calls.at(-1)?.[0]).toMatchObject({ quadrant: null });
  });

  it("rimuove tutti i monitor al disconnect e ignora callback della connessione precedente", async () => {
    const manager = new FakeManager();
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.initialize();
    await client.scanAndConnect();

    const first = manager.devices[0];
    const staleBatteryCallback = first.monitors.get(SONICARE.characteristics.batteryLevel)!;
    expect(first.monitorSubscriptions).toHaveLength(6);
    await client.disconnect();
    expect(first.monitorSubscriptions.every((item) => item.remove.mock.calls.length === 1)).toBe(true);
    expect(first.disconnectSubscription.remove).toHaveBeenCalledTimes(1);
    expect(manager.adapterSubscription.remove).not.toHaveBeenCalled();

    await client.scanAndConnect();
    const updatesBeforeStale = deviceUpdates.length;
    const logsBeforeStale = vi.mocked(events.onLog).mock.calls.length;
    staleBatteryCallback(null, { value: b64([3]) });
    staleBatteryCallback(new Error("subscription removed"), null);
    expect(deviceUpdates).toHaveLength(updatesBeforeStale);
    expect(events.onLog).toHaveBeenCalledTimes(logsBeforeStale);

    client.destroy();
    expect(manager.devices[1].monitorSubscriptions.every((item) => item.remove.mock.calls.length === 1)).toBe(true);
    expect(manager.devices[1].disconnectSubscription.remove).toHaveBeenCalledTimes(1);
    expect(manager.adapterSubscription.remove).toHaveBeenCalledTimes(1);
    expect(manager.destroy).toHaveBeenCalledTimes(1);
  });

  it("chiude la GATT fallita prima di consentire un retry", async () => {
    const manager = new FakeManager();
    manager.failServicesCount = 1;
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    await expect(client.scanAndConnect()).rejects.toThrow("GATT services failed");
    const failed = manager.devices[0];
    expect(failed.cancelConnection).toHaveBeenCalledTimes(1);
    expect(deviceUpdates.at(-1)).toBeNull();

    await expect(client.scanAndConnect()).resolves.toBeUndefined();
    expect(manager.devices).toHaveLength(2);
    expect(manager.devices[1].monitorSubscriptions).toHaveLength(6);
    client.destroy();
  });

  it("pulisce monitor e stato dopo una disconnessione remota", async () => {
    const manager = new FakeManager();
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();

    const device = manager.devices[0];
    const staleBatteryCallback = device.monitors.get(SONICARE.characteristics.batteryLevel)!;
    device.disconnectedCallback?.(new Error("link lost"));

    expect(device.monitorSubscriptions.every((item) => item.remove.mock.calls.length === 1)).toBe(true);
    expect(device.disconnectSubscription.remove).toHaveBeenCalledTimes(1);
    expect(deviceUpdates.at(-1)).toBeNull();
    expect(events.onStatus).toHaveBeenLastCalledWith("idle", "Spazzolino disconnesso");
    const updatesAfterDisconnect = deviceUpdates.length;
    staleBatteryCallback(null, { value: b64([2]) });
    expect(deviceUpdates).toHaveLength(updatesAfterDisconnect);
    client.destroy();
  });

  it("annulla una scansione pendente senza attendere il timeout", async () => {
    const manager = new FakeManager();
    manager.autoScanResult = false;
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    const connecting = client.scanAndConnect();
    await Promise.resolve();
    await client.disconnect();
    await expect(connecting).resolves.toBeUndefined();
    expect(manager.stopDeviceScan).toHaveBeenCalled();
    expect(events.onStatus).not.toHaveBeenCalledWith("error", expect.any(String));
  });

  it("ignora un connect tardivo dopo destroy e chiude il candidato", async () => {
    const manager = new FakeManager();
    manager.deferConnect = true;
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    const connecting = client.scanAndConnect();
    for (let attempt = 0; attempt < 12 && !manager.devices[0]?.connect.mock.calls.length; attempt += 1) {
      await Promise.resolve();
    }
    const candidate = manager.devices[0];
    expect(candidate).toBeDefined();
    expect(candidate.connect).toHaveBeenCalledTimes(1);
    client.destroy();
    await expect(connecting).resolves.toBeUndefined();

    expect(candidate.cancelConnection).toHaveBeenCalled();
    expect(deviceUpdates.filter(Boolean)).toHaveLength(0);
    expect(events.onStatus).not.toHaveBeenCalledWith("connected", expect.any(String));
    manager.releaseConnect?.();
  });

  it("recupera in ordine tutte le sessioni mancanti e ricostruisce l'orario dal clock", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      handleTime: 1_000,
      recordTimes: { 41: 800, 42: 900 },
    });
    const anchor = new Date(2026, 8, 23, 12).getTime();
    vi.useFakeTimers();
    vi.setSystemTime(anchor);

    const syncing = client.syncStoredSessionsSince({ lastSessionId: 40, acceptNextSession: false });
    await vi.runAllTimersAsync();
    const sessions = await syncing;

    expect(sessions.map((session) => session.sessionId)).toEqual([41, 42]);
    expect(sessions.map((session) => session.startedAt)).toEqual([
      anchor - 200_000,
      anchor - 100_000,
    ]);
    expect(sessions.every((session) => session.timeConfidence === "reconstructed")).toBe(true);
    vi.useRealTimers();
    client.destroy();
  });

  it("legge e valida solo latest quando sessionCount è assente alla prima sync", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      countError: missingSessionCountError(),
      handleTime: 1_000,
      recordTimes: { 42: 900 },
    });
    vi.useFakeTimers();

    const syncing = client.syncStoredSessionsSince(null);
    await vi.runAllTimersAsync();
    await expect(syncing).resolves.toMatchObject([
      { sessionId: 42, durationSeconds: 120 },
    ]);
    expect(manager.devices[0].writeCharacteristicWithResponseForService).toHaveBeenCalledTimes(1);
    expect(events.onLog).toHaveBeenCalledWith(
      "warning",
      "Prima sincronizzazione limitata all'ultima sessione: le sessioni precedenti non vengono recuperate",
    );
    vi.useRealTimers();
    client.destroy();
  });

  it("è idempotente lato client dopo il fallback latest con cursore persistito", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      countError: missingSessionCountError(),
      handleTime: 1_000,
      recordTimes: { 42: 900 },
    });
    vi.useFakeTimers();

    const firstSync = client.syncStoredSessionsSince(null);
    await vi.runAllTimersAsync();
    await expect(firstSync).resolves.toHaveLength(1);
    const writesAfterFirstSync = manager.devices[0].writeCharacteristicWithResponseForService.mock.calls.length;

    await expect(client.syncStoredSessionsSince({ lastSessionId: 42, acceptNextSession: false }))
      .resolves.toEqual([]);
    expect(manager.devices[0].writeCharacteristicWithResponseForService).toHaveBeenCalledTimes(
      writesAfterFirstSync,
    );
    vi.useRealTimers();
    client.destroy();
  });

  it("recupera il backfill noto alla prima sync quando sessionCount è presente e valido", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      handleTime: 1_000,
      recordTimes: { 41: 800, 42: 900 },
    });
    vi.useFakeTimers();

    const syncing = client.syncStoredSessionsSince(null);
    await vi.runAllTimersAsync();
    const sessions = await syncing;

    expect(sessions.map((session) => session.sessionId)).toEqual([41, 42]);
    expect(manager.devices[0].writeCharacteristicWithResponseForService).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
    client.destroy();
  });

  it("rifiuta un sessionCount troncato senza selezionare il record latest", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      countPayload: [2],
      handleTime: 1_000,
      recordTimes: { 41: 800, 42: 900 },
    });

    await expect(client.syncStoredSessionsSince(null)).rejects.toThrow(
      "Payload sessionCount BLE non valido",
    );
    expect(manager.devices[0].writeCharacteristicWithResponseForService).not.toHaveBeenCalled();
    client.destroy();
  });

  it("rifiuta lo storico di un manico non azzerato dopo Dimentica manico", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 101,
      count: 2,
      handleTime: 1_000,
      recordTimes: { 100: 800, 101: 900 },
    });

    await expect(client.syncStoredSessionsSince({
      lastSessionId: 101,
      acceptNextSession: true,
      resetBaselineSessionId: 101,
    })).rejects.toThrow("reset di fabbrica");
    expect(manager.devices[0].writeCharacteristicWithResponseForService).not.toHaveBeenCalled();
    client.destroy();
  });

  it("resta fail-closed dopo reset se sessionCount è assente", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 1,
      count: 1,
      countError: missingSessionCountError(),
      handleTime: 1_000,
      recordTimes: { 1: 900 },
    });

    await expect(client.syncStoredSessionsSince({
      lastSessionId: 101,
      acceptNextSession: true,
      resetBaselineSessionId: 101,
    })).rejects.toThrow("Conteggio storico BLE non disponibile: il reset non può essere verificato");
    expect(manager.devices[0].writeCharacteristicWithResponseForService).not.toHaveBeenCalled();
    client.destroy();
  });

  it.each([
    ["vuoto", ""],
    ["overlong", "AgAA"],
    ["Base64 malformato", "Ag?="],
  ])("rifiuta un sessionCount %s senza selezionare il record latest", async (_case, countBase64) => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      countBase64,
      handleTime: 1_000,
      recordTimes: { 41: 800, 42: 900 },
    });

    await expect(client.syncStoredSessionsSince(null)).rejects.toThrow(
      "Payload sessionCount BLE non valido",
    );
    expect(manager.devices[0].writeCharacteristicWithResponseForService).not.toHaveBeenCalled();
    client.destroy();
  });

  it("recupera una sequenza contigua attraverso il rollover uint16", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 1,
      count: 3,
      handleTime: 2_000,
      recordTimes: { 65_535: 1_700, 0: 1_800, 1: 1_900 },
    });
    vi.useFakeTimers();

    const syncing = client.syncStoredSessionsSince({ lastSessionId: 65_534, acceptNextSession: false });
    await vi.runAllTimersAsync();
    const sessions = await syncing;

    expect(sessions.map((session) => session.sessionId)).toEqual([65_535, 0, 1]);
    vi.useRealTimers();
    client.destroy();
  });

  it("rifiuta l'intero batch se un record selezionato non corrisponde all'ID atteso", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 42,
      count: 2,
      handleTime: 1_000,
      recordTimes: { 41: 800, 42: 900 },
      recordIds: { 41: 42 },
    });
    vi.useFakeTimers();

    const syncing = expect(
      client.syncStoredSessionsSince({ lastSessionId: 40, acceptNextSession: false }),
    ).rejects.toThrow("Record BLE 41");
    await vi.runAllTimersAsync();
    await syncing;
    vi.useRealTimers();
    client.destroy();
  });

  it("rilegge il record se il manico espone ancora quello precedente subito dopo la selezione", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    const device = manager.devices[0];
    configureStoredSessions(device, {
      latest: 42,
      count: 2,
      handleTime: 1_000,
      recordTimes: { 41: 800, 42: 900 },
    });
    // A slow handle keeps the previous record loaded for the first read after each selection.
    let loaded = 40;
    let selected = 40;
    let readsSinceSelection = 0;
    const configuredWrite = device.writeCharacteristicWithResponseForService.getMockImplementation();
    device.writeCharacteristicWithResponseForService.mockImplementation(async (service, characteristic, value, id) => {
      if (characteristic === SONICARE.characteristics.activeSessionId) {
        const bytes = toByteArray(value);
        selected = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
        readsSinceSelection = 0;
      }
      return configuredWrite!(service, characteristic, value, id);
    });
    const configuredRead = device.readCharacteristicForService.getMockImplementation();
    device.readCharacteristicForService.mockImplementation(async (service: string, characteristic: string) => {
      if (characteristic !== SONICARE.characteristics.sessionData) return configuredRead!(service, characteristic);
      readsSinceSelection += 1;
      if (readsSinceSelection > 1) loaded = selected;
      return { value: b64(sessionPayload(800 + (loaded - 41) * 100, loaded)) };
    });
    vi.useFakeTimers();

    const syncing = client.syncStoredSessionsSince({ lastSessionId: 40, acceptNextSession: false });
    await vi.runAllTimersAsync();
    const sessions = await syncing;

    expect(sessions.map((session) => session.sessionId)).toEqual([41, 42]);
    const dataReads = device.readCharacteristicForService.mock.calls
      .filter(([, characteristic]) => characteristic === SONICARE.characteristics.sessionData);
    expect(dataReads).toHaveLength(4);
    vi.useRealTimers();
    client.destroy();
  });

  it("scarta una sync del vecchio manico dopo disconnect e reconnect", async () => {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();

    const first = manager.devices[0];
    let releaseLatest!: () => void;
    first.readCharacteristicForService.mockImplementation(
      (_service: string, characteristic: string) => {
        if (characteristic === SONICARE.characteristics.latestSessionId) {
          return new Promise((resolve) => {
            releaseLatest = () => resolve({ value: b64([42, 0]) });
          });
        }
        return Promise.resolve({ value: b64([1]) });
      },
    );
    const staleSync = client.syncStoredSessionsSince({ lastSessionId: 41, acceptNextSession: false });
    await Promise.resolve();

    await client.disconnect();
    await client.scanAndConnect();
    const second = manager.devices[1];
    releaseLatest();

    await expect(staleSync).rejects.toThrow("Sincronizzazione Bluetooth annullata");
    expect(manager.cancelTransaction).toHaveBeenCalled();
    expect(first.writeCharacteristicWithResponseForService).not.toHaveBeenCalled();
    expect(second.writeCharacteristicWithResponseForService).not.toHaveBeenCalled();
    client.destroy();
  });

  describe("permesso Bluetooth e stato dell'adattatore", () => {
    it("su iOS crea il BleManager solo al primo collegamento, non all'avvio", async () => {
      const manager = new FakeManager();
      const factory = vi.fn(() => manager as never);
      const { events } = createEvents();
      const client = new NativeSonicareClient(events, factory);

      await client.initialize();
      expect(factory).not.toHaveBeenCalled();

      await client.scanAndConnect();
      expect(factory).toHaveBeenCalledTimes(1);
      expect(events.onAdapterState).toHaveBeenCalledWith("PoweredOn");
      client.destroy();
      expect(manager.destroy).toHaveBeenCalledTimes(1);
    });

    it("chiudendo l'app senza collegarsi non crea mai il BleManager", () => {
      const factory = vi.fn(() => new FakeManager() as never);
      const client = new NativeSonicareClient(createEvents().events, factory);
      void client.initialize();
      client.destroy();
      expect(factory).not.toHaveBeenCalled();
    });

    it("su Android mostra lo stato dell'adattatore fin dall'avvio", async () => {
      const previous = Platform.OS;
      Platform.OS = "android";
      try {
        const factory = vi.fn(() => new FakeManager() as never);
        const { events } = createEvents();
        const client = new NativeSonicareClient(events, factory);
        await client.initialize();
        expect(factory).toHaveBeenCalledTimes(1);
        expect(events.onAdapterState).toHaveBeenCalledWith("PoweredOn");
        client.destroy();
      } finally {
        Platform.OS = previous;
      }
    });

    it("attende che il Bluetooth sia pronto prima di cercare lo spazzolino", async () => {
      const manager = new FakeManager();
      manager.adapterState = "Unknown";
      const client = new NativeSonicareClient(createEvents().events, manager as never);

      const connecting = client.scanAndConnect();
      await Promise.resolve();
      expect(manager.startDeviceScan).not.toHaveBeenCalled();

      manager.emitState("PoweredOn");
      await connecting;
      expect(manager.startDeviceScan).toHaveBeenCalledTimes(1);
      client.destroy();
    });

    it.each([
      ["PoweredOff", "Bluetooth spento: attivalo e riprova"],
      ["Unauthorized", "Autorizzazione Bluetooth non concessa"],
      ["Unsupported", "Bluetooth non supportato da questo dispositivo"],
    ])("con adattatore %s spiega il motivo senza avviare la scansione", async (state, message) => {
      const manager = new FakeManager();
      manager.adapterState = state;
      const { events } = createEvents();
      const client = new NativeSonicareClient(events, manager as never);

      await expect(client.scanAndConnect()).rejects.toThrow(message);
      expect(manager.startDeviceScan).not.toHaveBeenCalled();
      expect(events.onStatus).toHaveBeenLastCalledWith("error", message);
      client.destroy();
    });
  });
});

describe("abbinamento al manico", () => {
  beforeEach(() => vi.clearAllMocks());

  function sonicare(id: string, name: string | null = "Sonicare4Kids"): FakeDevice {
    const device = new FakeDevice();
    device.id = id;
    device.name = name as string;
    device.localName = name as string;
    if (!name) device.serviceUUIDs = [];
    return device;
  }

  it("con un manico abbinato ignora gli altri Sonicare e si collega solo a quello, anche se avvisa senza nome", async () => {
    const manager = new FakeManager();
    const sibling = sonicare("sibling-brush");
    const paired = sonicare("kids-brush", null);
    manager.scanDevices = [sibling, paired];
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    await client.scanAndConnect({ mode: "paired", deviceId: "kids-brush" });

    expect(sibling.connect).not.toHaveBeenCalled();
    expect(paired.connect).toHaveBeenCalled();
    expect(deviceUpdates.at(-1)).toMatchObject({ id: "kids-brush" });
    expect(events.onLog).toHaveBeenCalledWith("info", "Scansione BLE avviata: cerco il manico abbinato");
    expect(events.onLog).toHaveBeenCalledWith("warning", "Trovato un altro manico: ignorato finché non cambi manico");
  });

  it("segnala che il manico abbinato non è in zona invece di collegarsi a un altro", async () => {
    vi.useFakeTimers();
    const manager = new FakeManager();
    manager.scanDevices = [sonicare("sibling-brush")];
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    const result = client.scanAndConnect({ mode: "paired", deviceId: "kids-brush" }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(45_000);
    const error = await result;

    expect((error as Error).message).toBe("Manico abbinato non trovato. Accendilo e tienilo vicino, oppure cambia manico.");
    expect(manager.devices[0].connect).not.toHaveBeenCalled();
    expect(manager.stopDeviceScan).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("'cambia manico' salta il manico abbinato e si collega al primo altro Sonicare", async () => {
    const manager = new FakeManager();
    const paired = sonicare("kids-brush");
    const other = sonicare("sibling-brush");
    manager.scanDevices = [paired, other];
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    await client.scanAndConnect({ mode: "replace", currentDeviceId: "kids-brush" });

    expect(paired.connect).not.toHaveBeenCalled();
    expect(deviceUpdates.at(-1)).toMatchObject({ id: "sibling-brush" });
    expect(events.onStatus).toHaveBeenCalledWith("scanning", "Accendi il nuovo manico e tienilo vicino");
    expect(events.onLog).toHaveBeenCalledWith("warning", "Manico già abbinato ignorato: accendi il nuovo manico");
  });

  it("'cambia manico' non si collega mai al manico già abbinato", async () => {
    vi.useFakeTimers();
    const manager = new FakeManager();
    manager.scanDevices = [sonicare("kids-brush")];
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    const result = client.scanAndConnect({ mode: "replace", currentDeviceId: "kids-brush" }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(45_000);
    const error = await result;

    expect((error as Error).message).toBe("Nessun altro manico trovato. Accendi il nuovo manico e tienilo vicino.");
    expect(manager.devices[0].connect).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("senza abbinamento accetta il primo Sonicare e ignora le altre periferiche", async () => {
    const manager = new FakeManager();
    const lamp = sonicare("lamp", "Smart Lamp");
    lamp.serviceUUIDs = [];
    const kids = sonicare("kids-brush");
    manager.scanDevices = [lamp, kids];
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    await client.scanAndConnect();

    expect(lamp.connect).not.toHaveBeenCalled();
    expect(deviceUpdates.at(-1)).toMatchObject({ id: "kids-brush" });
    expect(events.onLog).not.toHaveBeenCalledWith("warning", expect.stringContaining("ignorato"));
  });
});

describe("errori react-native-ble-plx", () => {
  beforeEach(() => vi.clearAllMocks());

  it("traduce il codice 601 (Localizzazione spenta su Android ≤ 11) in un messaggio dell'app", async () => {
    const manager = new FakeManager();
    manager.scanError = Object.assign(new Error("Location services are disabled"), { errorCode: 601 });
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    await expect(client.scanAndConnect()).rejects.toThrow("Location services are disabled");

    const expected = "Attiva la Localizzazione nelle impostazioni di Android: serve per la scansione Bluetooth";
    expect(events.onStatus).toHaveBeenLastCalledWith("error", expected);
    expect(events.onLog).toHaveBeenCalledWith("error", expected);
  });

  it("lascia intatti i messaggi senza codice noto", async () => {
    const manager = new FakeManager();
    manager.scanError = Object.assign(new Error("Scan failed"), { errorCode: 9999 });
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);

    await expect(client.scanAndConnect()).rejects.toThrow("Scan failed");
    expect(events.onStatus).toHaveBeenLastCalledWith("error", "Scan failed");
  });
});

describe("riallineamento dopo un intervallo non recuperabile (B4)", () => {
  beforeEach(() => vi.clearAllMocks());

  async function connectedClient(count: number | null) {
    const manager = new FakeManager();
    const { events } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();
    configureStoredSessions(manager.devices[0], {
      latest: 300,
      count: count ?? 0,
      countError: count === null ? missingSessionCountError() : undefined,
      handleTime: 1_000_000,
      recordTimes: {},
    });
    return { client, events, device: manager.devices[0] };
  }

  it("senza richiesta esplicita l'intervallo troppo ampio continua a bloccare la sync", async () => {
    const { client } = await connectedClient(128);
    await expect(client.syncStoredSessionsSince({ lastSessionId: 10, acceptNextSession: false }))
      .rejects.toThrow("Intervallo BLE non sicuro (290 sessioni)");
  });

  it("su richiesta importa l'ultimo batch che il manico conserva e registra quante sessioni sono perse", async () => {
    vi.useFakeTimers();
    const { client, events } = await connectedClient(128);
    const operation = client.syncStoredSessionsSince(
      { lastSessionId: 10, acceptNextSession: false },
      { allowGap: true },
    );
    // Each record waits for the handle to load it (180 ms): skip that wait for 128 records.
    await vi.advanceTimersByTimeAsync(128 * 1_000);
    const sessions = await operation;
    vi.useRealTimers();
    expect(sessions).toHaveLength(128);
    expect(sessions[0].sessionId).toBe(173);
    expect(sessions.at(-1)?.sessionId).toBe(300);
    expect(events.onLog).toHaveBeenCalledWith("warning", "Riallineamento: 162 sessioni del manico non recuperabili saltate");
  });

  it("senza sessionCount riprende dal solo record più recente", async () => {
    const { client, events } = await connectedClient(null);
    const sessions = await client.syncStoredSessionsSince(
      { lastSessionId: 10, acceptNextSession: false },
      { allowGap: true },
    );
    expect(sessions.map((session) => session.sessionId)).toEqual([300]);
    expect(events.onLog).toHaveBeenCalledWith("warning", "Riallineamento: 289 sessioni del manico non recuperabili saltate");
  });

  it("quando il manico ha scartato parte delle sessioni mancanti riprende da quelle ancora presenti", async () => {
    const { client, events } = await connectedClient(20);
    await expect(client.syncStoredSessionsSince({ lastSessionId: 250, acceptNextSession: false }))
      .rejects.toThrow("Lo storico del manico non contiene più tutte le sessioni mancanti");
    vi.useFakeTimers();
    const operation = client.syncStoredSessionsSince(
      { lastSessionId: 250, acceptNextSession: false },
      { allowGap: true },
    );
    await vi.advanceTimersByTimeAsync(20 * 1_000);
    const sessions = await operation;
    vi.useRealTimers();
    expect(sessions.map((session) => session.sessionId)).toEqual(Array.from({ length: 20 }, (_, i) => 281 + i));
    expect(events.onLog).toHaveBeenCalledWith("warning", "Riallineamento: 30 sessioni del manico non recuperabili saltate");
  });
});
