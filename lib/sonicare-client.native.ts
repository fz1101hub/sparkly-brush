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
  type DeviceSyncCursor,
  type SonicareClient,
  type StoredDeviceSession,
} from "@/lib/brush-types";
import {
  decodeKidsSession,
  reconstructSessionStart,
  uint32LE,
} from "@/lib/sonicare-codec";
import { assertSafePostResetSessions } from "@/lib/device-reset-guard";
import { HANDLE_STATE_LABELS, intensityFromByte, SONICARE } from "@/lib/sonicare-uuids";

const SCAN_TIMEOUT_MS = 14_000;
const MAX_SYNC_BATCH = 128;

function bytesFromBase64(value?: string | null): Uint8Array {
  if (!value) return new Uint8Array();
  const canonicalBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!canonicalBase64.test(value)) return new Uint8Array();
  try {
    const bytes = toByteArray(value);
    return fromByteArray(bytes) === value ? bytes : new Uint8Array();
  } catch {
    return new Uint8Array();
  }
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
  private readonly manager: BleManager;
  private readonly events: BleClientEvents;
  private device: Device | null = null;
  private deviceInfo: import("@/lib/brush-types").ToothbrushDevice | null = null;
  private adapterSubscription: Subscription | null = null;
  private connectionSubscriptions: Subscription[] = [];
  private connectionGeneration = 0;
  private operationGeneration = 0;
  private syncSequence = 0;
  private syncQueue: Promise<void> = Promise.resolve();
  private syncTransactions = new Set<string>();
  private cancelScan: (() => void) | null = null;
  private cancelOperation: (() => void) | null = null;
  private connecting = false;
  private destroyed = false;
  private live: BrushLiveData = { ...DEFAULT_LIVE_DATA };

  constructor(events: BleClientEvents, manager: BleManager = new BleManager()) {
    this.events = events;
    this.manager = manager;
  }

  async initialize(): Promise<void> {
    this.adapterSubscription?.remove();
    this.adapterSubscription = this.manager.onStateChange((state) => {
      this.events.onAdapterState(state);
      this.events.onLog("info", `Bluetooth: ${state}`);
    }, true);
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
    if (this.connecting) throw new Error("Connessione Bluetooth già in corso");
    if (this.destroyed) throw new Error("Client Bluetooth non disponibile");
    this.connecting = true;
    const operationGeneration = ++this.operationGeneration;
    const cancellation = new Promise<never>((_resolve, reject) => {
      this.cancelOperation = () => reject(new Error("Connessione Bluetooth annullata"));
    });
    const guard = <T,>(operation: Promise<T>): Promise<T> => Promise.race([operation, cancellation]);
    let candidate: Device | null = null;
    try {
      await this.resetConnection();
      await guard(this.requestPermissions());
      this.assertOperation(operationGeneration);
      this.events.onStatus("scanning", "Accendi lo spazzolino e tienilo vicino");
      this.events.onLog("info", "Scansione BLE avviata (Sonicare4Kids)");

      const found = await guard(new Promise<Device>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          this.manager.stopDeviceScan();
          reject(new Error("Spazzolino non trovato. Accendilo e riprova."));
        }, SCAN_TIMEOUT_MS);
        this.cancelScan = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          reject(new Error("Connessione Bluetooth annullata"));
        };

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
      }).finally(() => {
        this.cancelScan = null;
      }));
      this.assertOperation(operationGeneration);

      this.events.onStatus("connecting", "Connessione e lettura dei servizi");
      this.events.onLog("success", `Trovato ${found.name ?? found.localName ?? "Sonicare"}`);

      candidate = found;
      const connected = await guard(found.connect({ timeout: 12_000 }));
      candidate = connected;
      this.assertOperation(operationGeneration);
      this.device = await guard(connected.discoverAllServicesAndCharacteristics());
      candidate = this.device;
      this.assertOperation(operationGeneration);
      this.connectionGeneration += 1;
      const services = await guard(this.device.services());
      this.assertOperation(operationGeneration);
      this.events.onLog("info", `${services.length} servizi GATT rilevati`);

      const [model, firmware, battery, handleState, elapsed, target, intensity] =
        await guard(Promise.all([
          this.readText(SONICARE.services.deviceInfo, SONICARE.characteristics.modelNumber),
          this.readText(SONICARE.services.deviceInfo, SONICARE.characteristics.firmwareRevision),
          this.readByte(SONICARE.services.battery, SONICARE.characteristics.batteryLevel),
          this.readByte(SONICARE.services.primary, SONICARE.characteristics.handleState),
          this.readUint16(SONICARE.services.routine, SONICARE.characteristics.brushingTime),
          this.readUint16(SONICARE.services.routine, SONICARE.characteristics.routineLength),
          this.readByte(SONICARE.services.routine, SONICARE.characteristics.intensity),
        ]));
      this.assertOperation(operationGeneration);

      this.live = {
        ...this.live,
        handleState: handleState ?? 1,
        isBrushing: handleState === 2,
        elapsedSeconds: elapsed ?? 0,
        routineSeconds: target && target > 0 ? target : 120,
        intensity: intensityFromByte(intensity ?? undefined),
      };

      this.deviceInfo = {
        id: this.device.id,
        name: this.device.name ?? this.device.localName ?? "Sonicare4Kids",
        model: model ? `HX6322/04 · ${model}` : "HX6322/04",
        firmware: firmware || undefined,
        battery: battery ?? undefined,
      };
      this.events.onDevice({ ...this.deviceInfo });
      this.events.onLiveData({ ...this.live });
      this.installMonitors();

      const connectedDeviceId = this.device.id;
      const connectionGeneration = this.connectionGeneration;
      this.connectionSubscriptions.push(this.device.onDisconnected((error) => {
        this.handleDisconnected(connectedDeviceId, connectionGeneration, error);
      }));

      this.events.onStatus("connected", "Sonicare pronto");
      this.events.onLog("success", "Connessione completata: GATT aperto HX63xx");
    } catch (error) {
      this.manager.stopDeviceScan();
      await this.resetConnection(candidate);
      if (operationGeneration !== this.operationGeneration || this.destroyed) return;
      const message = error instanceof Error ? error.message : "Errore Bluetooth sconosciuto";
      this.events.onStatus("error", message);
      this.events.onLog("error", message);
      throw error;
    } finally {
      this.cancelOperation = null;
      this.connecting = false;
    }
  }

  private assertOperation(generation: number): void {
    if (this.destroyed || generation !== this.operationGeneration) {
      throw new Error("Connessione Bluetooth annullata");
    }
  }

  private installMonitors(): void {
    if (!this.device) return;
    this.clearMonitorSubscriptions();

    this.monitor(
      SONICARE.services.primary,
      SONICARE.characteristics.handleState,
      (bytes) => {
        const handleState = bytes[0] ?? 1;
        this.live = {
          ...this.live,
          handleState,
          isBrushing: handleState === 2,
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
        if (battery === undefined || !this.deviceInfo) return;
        this.deviceInfo = { ...this.deviceInfo, battery };
        this.events.onDevice({ ...this.deviceInfo });
      },
    );
  }

  private monitor(service: string, characteristic: string, callback: (bytes: Uint8Array) => void) {
    if (!this.device) return;
    const connectedDeviceId = this.device.id;
    const connectionGeneration = this.connectionGeneration;
    const subscription = this.device.monitorCharacteristicForService(
      service,
      characteristic,
      (error, value) => {
        if (
          this.destroyed
          || this.device?.id !== connectedDeviceId
          || this.connectionGeneration !== connectionGeneration
        ) return;
        if (error) {
          this.events.onLog("warning", `Notifica non disponibile: ${characteristic.slice(-4)}`);
          return;
        }
        callback(bytesFromBase64(value?.value));
      },
    );
    this.connectionSubscriptions.push(subscription);
  }

  private clearMonitorSubscriptions(): void {
    this.connectionSubscriptions.forEach((subscription) => subscription.remove());
    this.connectionSubscriptions = [];
  }

  private clearConnectionSubscriptions(): void {
    this.clearMonitorSubscriptions();
  }

  private cancelSyncTransactions(): void {
    for (const transactionId of this.syncTransactions) {
      void this.manager.cancelTransaction(transactionId).catch(() => undefined);
    }
    this.syncTransactions.clear();
  }

  private assertConnection(device: Device, generation: number): void {
    if (
      this.destroyed
      || this.device !== device
      || this.connectionGeneration !== generation
    ) {
      throw new Error("Sincronizzazione Bluetooth annullata");
    }
  }

  private async syncTransaction<T>(transactionId: string, operation: () => Promise<T>): Promise<T> {
    this.syncTransactions.add(transactionId);
    try {
      return await operation();
    } finally {
      this.syncTransactions.delete(transactionId);
    }
  }

  private resetLiveData(notify: boolean): void {
    this.live = { ...DEFAULT_LIVE_DATA };
    if (notify && !this.destroyed) this.events.onLiveData({ ...this.live });
  }

  private async resetConnection(candidate?: Device | null): Promise<void> {
    this.connectionGeneration += 1;
    this.cancelSyncTransactions();
    this.clearConnectionSubscriptions();
    const connected = this.device;
    this.device = null;
    this.deviceInfo = null;
    const devices = [candidate, connected].filter(
      (device, index, list): device is Device => Boolean(device) && list.indexOf(device) === index,
    );
    await Promise.all(devices.map((device) => device.cancelConnection().catch(() => undefined)));
    this.resetLiveData(true);
    if (!this.destroyed) this.events.onDevice(null);
  }

  private handleDisconnected(deviceId: string, generation: number, error?: Error | null): void {
    if (this.device?.id !== deviceId || this.connectionGeneration !== generation) return;
    this.cancelSyncTransactions();
    this.clearConnectionSubscriptions();
    this.resetLiveData(true);
    this.device = null;
    this.deviceInfo = null;
    this.events.onStatus("idle", "Spazzolino disconnesso");
    this.events.onDevice(null);
    this.events.onLog(error ? "warning" : "info", "Connessione Bluetooth terminata");
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

  private sessionIdsToSync(
    latest: number,
    sessionCount: number | null,
    cursor?: DeviceSyncCursor | null,
  ): number[] {
    if (!cursor) {
      if (sessionCount === 0) return [];
      if (sessionCount === null) {
        throw new Error("Conteggio storico BLE non disponibile: il cursore resta invariato per evitare sessioni perse");
      }
      const available = sessionCount;
      if (available > MAX_SYNC_BATCH) {
        throw new Error(`Il manico espone ${available} sessioni: sincronizzazione oltre il limite sicuro`);
      }
      return Array.from(
        { length: available },
        (_, index) => (latest - available + index + 1 + 0x1_0000) & 0xffff,
      );
    }

    if (cursor.acceptNextSession) {
      if (sessionCount === 0) return [];
      if (sessionCount === null) {
        throw new Error("Conteggio storico BLE non disponibile: il reset non può essere verificato");
      }
      const available = sessionCount;
      if (available > MAX_SYNC_BATCH) {
        throw new Error(`Il manico espone ${available} sessioni: sincronizzazione oltre il limite sicuro`);
      }
      const sessionIds = Array.from(
        { length: available },
        (_, index) => (latest - available + index + 1 + 0x1_0000) & 0xffff,
      );
      assertSafePostResetSessions({
        resetBaselineSessionId: cursor.resetBaselineSessionId,
        sessionIds,
      });
      return sessionIds;
    }

    if (latest === cursor.lastSessionId) return [];
    const rollover = cursor.lastSessionId >= 65_000 && latest <= 1_024;
    if (latest < cursor.lastSessionId && !rollover) {
      throw new Error("Il contatore del manico sembra essere stato azzerato: usa ‘Dimentica manico resettato’");
    }
    const distance = rollover
      ? 0x1_0000 - cursor.lastSessionId + latest
      : latest - cursor.lastSessionId;
    if (distance <= 0 || distance > MAX_SYNC_BATCH) {
      throw new Error(`Intervallo BLE non sicuro (${distance} sessioni): il cursore non è stato avanzato`);
    }
    if (sessionCount !== null && distance > sessionCount) {
      throw new Error("Lo storico del manico non contiene più tutte le sessioni mancanti");
    }
    return Array.from(
      { length: distance },
      (_, index) => (cursor.lastSessionId + index + 1) & 0xffff,
    );
  }

  private async readText(service: string, characteristic: string): Promise<string> {
    const value = await this.readCharacteristic(service, characteristic);
    return ascii(bytesFromBase64(value?.value));
  }

  private async syncCapturedDevice(
    device: Device,
    generation: number,
    cursor?: DeviceSyncCursor | null,
  ): Promise<StoredDeviceSession[]> {
    this.assertConnection(device, generation);
    const transactionPrefix = `sonicare-sync-${generation}-${++this.syncSequence}`;
    const latestValue = await this.syncTransaction(
      `${transactionPrefix}-latest`,
      () => device.readCharacteristicForService(
        SONICARE.services.kidsSession,
        SONICARE.characteristics.latestSessionId,
        `${transactionPrefix}-latest`,
      ),
    );
    this.assertConnection(device, generation);
    const latestBytes = bytesFromBase64(latestValue?.value);
    const latest = latestBytes.length >= 2 ? uint16LE(latestBytes) : null;
    if (latest === null) return [];

    let sessionCount: number | null = null;
    try {
      const countValue = await this.syncTransaction(
        `${transactionPrefix}-count`,
        () => device.readCharacteristicForService(
          SONICARE.services.kidsSession,
          SONICARE.characteristics.sessionCount,
          `${transactionPrefix}-count`,
        ),
      );
      this.assertConnection(device, generation);
      const countBytes = bytesFromBase64(countValue?.value);
      sessionCount = countBytes.length === 2 ? uint16LE(countBytes) : null;
    } catch {
      this.assertConnection(device, generation);
      this.events.onLog("warning", "Conteggio storico BLE non disponibile; sincronizzazione prudente");
    }

    const anchorBefore = Date.now();
    let currentHandleTimestampSeconds: number | null = null;
    try {
      const handleTimeValue = await this.syncTransaction(
        `${transactionPrefix}-time`,
        () => device.readCharacteristicForService(
          SONICARE.services.primary,
          SONICARE.characteristics.handleTime,
          `${transactionPrefix}-time`,
        ),
      );
      this.assertConnection(device, generation);
      const handleTimeBytes = bytesFromBase64(handleTimeValue?.value);
      if (handleTimeBytes.length >= 4) currentHandleTimestampSeconds = uint32LE(handleTimeBytes);
    } catch {
      this.assertConnection(device, generation);
      this.events.onLog("warning", "Clock del manico non disponibile: data sessione approssimata");
    }
    const anchorWallTime = Math.floor((anchorBefore + Date.now()) / 2);
    const sessionIds = this.sessionIdsToSync(latest, sessionCount, cursor);
    const sessions: StoredDeviceSession[] = [];

    for (const sessionId of sessionIds) {
      await this.syncTransaction(
        `${transactionPrefix}-select-${sessionId}`,
        () => device.writeCharacteristicWithResponseForService(
          SONICARE.services.kidsSession,
          SONICARE.characteristics.activeSessionId,
          base64FromBytes([sessionId & 0xff, (sessionId >> 8) & 0xff]),
          `${transactionPrefix}-select-${sessionId}`,
        ),
      );
      this.assertConnection(device, generation);
      await new Promise((resolve) => setTimeout(resolve, 180));
      this.assertConnection(device, generation);

      const value = await this.syncTransaction(
        `${transactionPrefix}-data-${sessionId}`,
        () => device.readCharacteristicForService(
          SONICARE.services.kidsSession,
          SONICARE.characteristics.sessionData,
          `${transactionPrefix}-data-${sessionId}`,
        ),
      );
      this.assertConnection(device, generation);
      const decoded = decodeKidsSession(bytesFromBase64(value?.value), sessionId);
      if (!decoded) {
        throw new Error(`Record BLE ${sessionId} mancante o non riconosciuto; cursore invariato`);
      }
      const timing = currentHandleTimestampSeconds !== null
        && decoded.handleTimestampSeconds !== undefined
        ? reconstructSessionStart({
          recordHandleTimestampSeconds: decoded.handleTimestampSeconds,
          currentHandleTimestampSeconds,
          anchorWallTime,
          durationSeconds: decoded.durationSeconds,
        })
        : {
          startedAt: anchorWallTime - decoded.durationSeconds * 1_000,
          timeConfidence: "approximate" as const,
        };
      sessions.push({ ...decoded, ...timing });
      this.events.onLog("success", `Sessione ${decoded.sessionId} letta (${decoded.durationSeconds}s)`);
    }

    if (sessions.length > 0) {
      this.events.onLog("success", `${sessions.length} sessioni BLE pronte per il salvataggio atomico`);
    }
    return sessions;
  }

  async syncStoredSessionsSince(cursor?: DeviceSyncCursor | null): Promise<StoredDeviceSession[]> {
    const device = this.device;
    if (!device) throw new Error("Collega prima lo spazzolino");
    const generation = this.connectionGeneration;
    const operation = this.syncQueue.then(() => this.syncCapturedDevice(device, generation, cursor));
    this.syncQueue = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async disconnect(): Promise<void> {
    this.operationGeneration += 1;
    this.cancelScan?.();
    this.cancelOperation?.();
    this.manager.stopDeviceScan();
    await this.resetConnection();
    this.events.onStatus("idle", "Disconnesso");
  }

  destroy(): void {
    this.destroyed = true;
    this.operationGeneration += 1;
    this.cancelScan?.();
    this.cancelOperation?.();
    this.manager.stopDeviceScan();
    this.connectionGeneration += 1;
    this.cancelSyncTransactions();
    this.clearConnectionSubscriptions();
    this.adapterSubscription?.remove();
    this.adapterSubscription = null;
    void this.device?.cancelConnection().catch(() => undefined);
    this.device = null;
    this.deviceInfo = null;
    try {
      const result = this.manager.destroy() as unknown;
      if (result && typeof (result as PromiseLike<void>).then === "function") {
        void Promise.resolve(result).catch(() => undefined);
      }
    } catch {
      // The native manager is already unusable; destroy remains best-effort.
    }
  }
}

export function createSonicareClient(events: BleClientEvents): SonicareClient {
  return new NativeSonicareClient(events);
}
