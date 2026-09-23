import { fromByteArray } from "base64-js";
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

import type { BleClientEvents, ToothbrushDevice } from "@/lib/brush-types";
import { NativeSonicareClient } from "@/lib/sonicare-client.native";
import { SONICARE } from "@/lib/sonicare-uuids";

function b64(bytes: number[]) {
  return fromByteArray(Uint8Array.from(bytes));
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
  writeCharacteristicWithResponseForService = vi.fn(async () => ({}));

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

class FakeManager {
  devices: FakeDevice[] = [];
  failServicesCount = 0;
  autoScanResult = true;
  deferConnect = false;
  releaseConnect: (() => void) | null = null;
  adapterSubscription = new FakeSubscription();
  stopDeviceScan = vi.fn();
  cancelTransaction = vi.fn(async () => undefined);
  destroy = vi.fn();
  onStateChange = vi.fn((callback: (state: string) => void) => {
    callback("PoweredOn");
    return this.adapterSubscription;
  });
  startDeviceScan = vi.fn((_uuids, _options, callback) => {
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

  it("preserva modello e firmware quando arriva una notifica batteria", async () => {
    const manager = new FakeManager();
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.scanAndConnect();

    const device = manager.devices[0];
    device.monitors.get(SONICARE.characteristics.batteryLevel)?.(null, { value: b64([42]) });
    const last = deviceUpdates.at(-1);
    expect(last).toMatchObject({ model: "HX6322/04 · HX6340", firmware: "1.2.3", battery: 42 });
  });

  it("rimuove tutti i monitor al disconnect e ignora callback della connessione precedente", async () => {
    const manager = new FakeManager();
    const { events, deviceUpdates } = createEvents();
    const client = new NativeSonicareClient(events, manager as never);
    await client.initialize();
    await client.scanAndConnect();

    const first = manager.devices[0];
    const staleBatteryCallback = first.monitors.get(SONICARE.characteristics.batteryLevel)!;
    expect(first.monitorSubscriptions).toHaveLength(5);
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
    expect(manager.devices[1].monitorSubscriptions).toHaveLength(5);
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
    const staleSync = client.syncLatestSession();
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
});
