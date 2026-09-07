import { PermissionsAndroid, Platform } from "react-native";
import { fromByteArray, toByteArray } from "base64-js";
import {
  BleManager,
  type Characteristic,
  type Device,
  type Subscription,
} from "react-native-ble-plx";

import {
  DEFAULT_LIVE_DATA,
  type BleClientEvents,
  type BrushLiveData,
  type SonicareClient,
  type StoredDeviceSession,
} from "@/lib/brush-types";
import { decodeKidsSession } from "@/lib/sonicare-codec";
import { HANDLE_STATE_LABELS, intensityFromByte, SONICARE } from "@/lib/sonicare-uuids";

const SCAN_TIMEOUT_MS = 14_000;

function bytesFromBase64(value?: string | null): Uint8Array {
  if (!value) return new Uint8Array();
  return toByteArray(value);
}

function base64FromBytes(bytes: number[]): string {
  return fromByteArray(Uint8Array.from(bytes));
}

function uint16LE(bytes: Uint8Array): number {
  return (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
}

function ascii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => String.fromCharCode(value))
    .join("")
    .replace(/\0/g, "")
    .trim();
}

function isSonicare(device: Device): boolean {
  const name = `${device.name ?? ""} ${device.localName ?? ""}`.toLowerCase();
  if (name.includes("sonicare")) return true;
  return (device.serviceUUIDs ?? []).some((uuid) =>
    uuid.toLowerCase().startsWith("477ea600-a260-11e4-ae37-0002a5d5"),
  );
}

export class NativeSonicareClient implements SonicareClient {
  private readonly manager = new BleManager();
  private readonly events: BleClientEvents;
  private device: Device | null = null;
  private subscriptions: Subscription[] = [];
  private live: BrushLiveData = { ...DEFAULT_LIVE_DATA };

  constructor(events: BleClientEvents) {
    this.events = events;
  }

  async initialize(): Promise<void> {
    const stateSubscription = this.manager.onStateChange((state) => {
      this.events.onAdapterState(state);
      this.events.onLog("info", `Bluetooth: ${state}`);
    }, true);
    this.subscriptions.push(stateSubscription);
  }

  private async requestPermissions(): Promise<void> {
    if (Platform.OS !== "android") return;

    const androidVersion = Number(Platform.Version);
    if (androidVersion >= 31) {
      const scan = PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN;
      const connect = PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;
      const result = await PermissionsAndroid.requestMultiple([scan, connect]);
      if (
        result[scan] !== PermissionsAndroid.RESULTS.GRANTED ||
        result[connect] !== PermissionsAndroid.RESULTS.GRANTED
      ) {
        throw new Error("Autorizzazione Bluetooth non concessa");
      }
      return;
    }

    const location = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
    const result = await PermissionsAndroid.request(location);
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("Autorizzazione posizione necessaria per la scansione BLE");
    }
  }

  async scanAndConnect(): Promise<void> {
    try {
      await this.requestPermissions();
      this.events.onStatus("scanning", "Accendi lo spazzolino e tienilo vicino");
      this.events.onLog("info", "Scansione BLE avviata (Sonicare4Kids)");

      const found = await new Promise<Device>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          this.manager.stopDeviceScan();
          reject(new Error("Spazzolino non trovato. Accendilo e riprova."));
        }, SCAN_TIMEOUT_MS);

        this.manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
          if (settled) return;
          if (error) {
            settled = true;
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            reject(error);
            return;
          }
          if (device && isSonicare(device)) {
            settled = true;
            clearTimeout(timeout);
            this.manager.stopDeviceScan();
            resolve(device);
          }
        });
      });

      this.events.onStatus("connecting", "Connessione e lettura dei servizi");
      this.events.onLog("success", `Trovato ${found.name ?? found.localName ?? "Sonicare"}`);

      const connected = await found.connect({ timeout: 12_000 });
      this.device = await connected.discoverAllServicesAndCharacteristics();
      const services = await this.device.services();
      this.events.onLog("info", `${services.length} servizi GATT rilevati`);

      const [model, firmware, battery, handleState, elapsed, target, intensity] =
        await Promise.all([
          this.readText(SONICARE.services.deviceInfo, SONICARE.characteristics.modelNumber),
          this.readText(SONICARE.services.deviceInfo, SONICARE.characteristics.firmwareRevision),
          this.readByte(SONICARE.services.battery, SONICARE.characteristics.batteryLevel),
          this.readByte(SONICARE.services.primary, SONICARE.characteristics.handleState),
          this.readUint16(SONICARE.services.routine, SONICARE.characteristics.brushingTime),
          this.readUint16(SONICARE.services.routine, SONICARE.characteristics.routineLength),
          this.readByte(SONICARE.services.routine, SONICARE.characteristics.intensity),
        ]);

      this.live = {
        ...this.live,
        handleState: handleState ?? 1,
        isBrushing: handleState === 2,
        elapsedSeconds: elapsed ?? 0,
        routineSeconds: target && target > 0 ? target : 120,
        intensity: intensityFromByte(intensity ?? undefined),
      };

      this.events.onDevice({
        id: this.device.id,
        name: this.device.name ?? this.device.localName ?? "Sonicare4Kids",
        model: model ? `HX6322/04 · ${model}` : "HX6322/04",
        firmware: firmware || undefined,
        battery: battery ?? undefined,
      });
      this.events.onLiveData({ ...this.live });
      this.installMonitors();

      this.device.onDisconnected((error) => {
        this.events.onStatus("idle", "Spazzolino disconnesso");
        this.events.onDevice(null);
        this.events.onLog(error ? "warning" : "info", "Connessione Bluetooth terminata");
        this.device = null;
      });

      this.events.onStatus("connected", "Sonicare pronto");
      this.events.onLog("success", "Connessione completata: GATT aperto HX63xx");
    } catch (error) {
      this.manager.stopDeviceScan();
      const message = error instanceof Error ? error.message : "Errore Bluetooth sconosciuto";
      this.events.onStatus("error", message);
      this.events.onLog("error", message);
      throw error;
    }
  }

  private installMonitors(): void {
    if (!this.device) return;

    this.monitor(
      SONICARE.services.primary,
      SONICARE.characteristics.handleState,
      (bytes) => {
        const handleState = bytes[0] ?? 1;
        this.live = {
          ...this.live,
          handleState,
          isBrushing: handleState === 2,
          elapsedSeconds: handleState === 2 ? this.live.elapsedSeconds : this.live.elapsedSeconds,
        };
        this.events.onLiveData({ ...this.live });
        this.events.onLog("info", `Stato manico: ${HANDLE_STATE_LABELS[handleState] ?? handleState}`);
      },
    );

    this.monitor(
      SONICARE.services.routine,
      SONICARE.characteristics.brushingTime,
      (bytes) => {
        this.live = { ...this.live, elapsedSeconds: uint16LE(bytes) };
        this.events.onLiveData({ ...this.live });
      },
    );

    this.monitor(
      SONICARE.services.routine,
      SONICARE.characteristics.routineLength,
      (bytes) => {
        const routineSeconds = uint16LE(bytes);
        if (routineSeconds > 0) {
          this.live = { ...this.live, routineSeconds };
          this.events.onLiveData({ ...this.live });
        }
      },
    );

    this.monitor(
      SONICARE.services.routine,
      SONICARE.characteristics.intensity,
      (bytes) => {
        this.live = { ...this.live, intensity: intensityFromByte(bytes[0]) };
        this.events.onLiveData({ ...this.live });
      },
    );

    this.monitor(
      SONICARE.services.battery,
      SONICARE.characteristics.batteryLevel,
      (bytes) => {
        const battery = bytes[0];
        if (battery === undefined || !this.device) return;
        this.events.onDevice({
          id: this.device.id,
          name: this.device.name ?? this.device.localName ?? "Sonicare4Kids",
          model: "HX6322/04",
          battery,
        });
      },
    );
  }

  private monitor(service: string, characteristic: string, callback: (bytes: Uint8Array) => void) {
    if (!this.device) return;
    const subscription = this.device.monitorCharacteristicForService(
      service,
      characteristic,
      (error, value) => {
        if (error) {
          this.events.onLog("warning", `Notifica non disponibile: ${characteristic.slice(-4)}`);
          return;
        }
        callback(bytesFromBase64(value?.value));
      },
    );
    this.subscriptions.push(subscription);
  }

  private async readCharacteristic(service: string, characteristic: string): Promise<Characteristic | null> {
    if (!this.device) return null;
    try {
      return await this.device.readCharacteristicForService(service, characteristic);
    } catch {
      this.events.onLog("warning", `Lettura opzionale non disponibile: ${characteristic.slice(-4)}`);
      return null;
    }
  }

  private async readByte(service: string, characteristic: string): Promise<number | null> {
    const value = await this.readCharacteristic(service, characteristic);
    return bytesFromBase64(value?.value)[0] ?? null;
  }

  private async readUint16(service: string, characteristic: string): Promise<number | null> {
    const value = await this.readCharacteristic(service, characteristic);
    const bytes = bytesFromBase64(value?.value);
    return bytes.length >= 2 ? uint16LE(bytes) : null;
  }

  private async readText(service: string, characteristic: string): Promise<string> {
    const value = await this.readCharacteristic(service, characteristic);
    return ascii(bytesFromBase64(value?.value));
  }

  async syncLatestSession(): Promise<StoredDeviceSession | null> {
    if (!this.device) throw new Error("Collega prima lo spazzolino");

    const latest = await this.readUint16(
      SONICARE.services.kidsSession,
      SONICARE.characteristics.latestSessionId,
    );
    if (latest === null) return null;

    await this.device.writeCharacteristicWithResponseForService(
      SONICARE.services.kidsSession,
      SONICARE.characteristics.activeSessionId,
      base64FromBytes([latest & 0xff, (latest >> 8) & 0xff]),
    );
    await new Promise((resolve) => setTimeout(resolve, 180));

    const value = await this.readCharacteristic(
      SONICARE.services.kidsSession,
      SONICARE.characteristics.sessionData,
    );
    const bytes = bytesFromBase64(value?.value);
    if (bytes.length < 14) return null;

    const decoded = decodeKidsSession(bytes, latest);
    if (!decoded) {
      this.events.onLog("warning", "Formato della sessione non riconosciuto");
      return null;
    }
    this.events.onLog("success", `Sessione ${decoded.sessionId} sincronizzata (${decoded.durationSeconds}s)`);
    return decoded;
  }

  async disconnect(): Promise<void> {
    this.manager.stopDeviceScan();
    if (this.device) {
      await this.device.cancelConnection().catch(() => undefined);
    }
    this.device = null;
    this.events.onDevice(null);
    this.events.onStatus("idle", "Disconnesso");
  }

  destroy(): void {
    this.manager.stopDeviceScan();
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];
    void this.device?.cancelConnection().catch(() => undefined);
    this.manager.destroy();
  }
}

export function createSonicareClient(events: BleClientEvents): SonicareClient {
  return new NativeSonicareClient(events);
}
