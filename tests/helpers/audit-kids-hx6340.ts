import { fromByteArray, toByteArray } from "base64-js";
import { vi } from "vitest";

import { SONICARE } from "@/lib/sonicare-uuids";

/**
 * GATT fake modelled on the documented HX6340 Kids capture (firmware 4.2.2).
 * The captured 0003 service exposes 4100, 40e0, 40d0 and 40f0 only: 40d2
 * (sessionCount) is deliberately absent. It is not a physical-device test.
 */
const b64 = (bytes: number[]) => fromByteArray(Uint8Array.from(bytes));
const u16 = (value: number) => [value & 0xff, (value >> 8) & 0xff];
const u32 = (value: number) => [
  value & 0xff,
  (value >>> 8) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 24) & 0xff,
];

export type AuditKidsRecord = {
  stamp: number;
  duration?: number;
  target?: number;
};

type Notification = (
  error: Error | null,
  value: { value: string } | null,
) => void;

class Subscription {
  remove = vi.fn();
}

function missingCharacteristic(
  characteristic: string,
): Error & { errorCode: number } {
  return Object.assign(
    new Error(`Characteristic ${characteristic} not found`),
    { errorCode: 404 },
  );
}

export class AuditHx6340KidsDevice {
  id = "24:E5:AA:00:00:02";
  name = "Sonicare4Kids";
  localName = "Sonicare4Kids";
  serviceUUIDs = [SONICARE.services.primary];
  handleClock = 26_500_000;
  handleState = 1;
  records = new Map<number, Required<AuditKidsRecord>>();
  selected: number | null = null;
  sessionCountReads = 0;
  private monitors = new Map<string, Notification>();
  private disconnected: ((error: Error | null) => void) | null = null;

  cancelConnection = vi.fn(async () => this);
  connect = vi.fn(async () => this);
  discoverAllServicesAndCharacteristics = vi.fn(async () => this);
  services = vi.fn(async () =>
    Object.values(SONICARE.services).map((uuid) => ({ uuid })),
  );

  private latest(): number {
    return Math.max(0, ...this.records.keys());
  }

  private characteristicTable(): Record<string, [string, () => number[]]> {
    return {
      [SONICARE.characteristics.modelNumber]: [
        SONICARE.services.deviceInfo,
        () => [..."HX6340   "].map((character) => character.charCodeAt(0)),
      ],
      [SONICARE.characteristics.firmwareRevision]: [
        SONICARE.services.deviceInfo,
        () => [..."4.2.2"].map((character) => character.charCodeAt(0)),
      ],
      [SONICARE.characteristics.batteryLevel]: [
        SONICARE.services.battery,
        () => [80],
      ],
      [SONICARE.characteristics.handleState]: [
        SONICARE.services.primary,
        () => [this.handleState],
      ],
      [SONICARE.characteristics.handleTime]: [
        SONICARE.services.primary,
        () => u32(this.handleClock),
      ],
      [SONICARE.characteristics.brushingTime]: [
        SONICARE.services.routine,
        () => u16(0),
      ],
      [SONICARE.characteristics.routineLength]: [
        SONICARE.services.routine,
        () => u16(120),
      ],
      [SONICARE.characteristics.intensity]: [
        SONICARE.services.routine,
        () => [1],
      ],
      [SONICARE.characteristics.sessionId]: [
        SONICARE.services.routine,
        () => u16(this.latest() + 1),
      ],
      [SONICARE.characteristics.latestSessionId]: [
        SONICARE.services.kidsSession,
        () => u16(this.latest()),
      ],
      [SONICARE.characteristics.sessionData]: [
        SONICARE.services.kidsSession,
        () => {
          const record =
            this.selected === null
              ? undefined
              : this.records.get(this.selected);
          if (!record || this.selected === null) return new Array(16).fill(0);
          return [
            ...u32(record.stamp),
            ...u16(this.selected),
            ...u16(record.duration),
            ...u16(record.target),
            0,
            1,
            0,
            0,
            0,
            0,
          ];
        },
      ],
    };
  }

  readCharacteristicForService = vi.fn(
    async (service: string, characteristic: string) => {
      if (characteristic === SONICARE.characteristics.sessionCount) {
        this.sessionCountReads += 1;
        throw missingCharacteristic(characteristic);
      }
      const entry = this.characteristicTable()[characteristic];
      if (!entry || entry[0] !== service)
        throw missingCharacteristic(characteristic);
      return { value: b64(entry[1]()) };
    },
  );

  writeCharacteristicWithResponseForService = vi.fn(
    async (service: string, characteristic: string, value: string) => {
      if (
        service !== SONICARE.services.kidsSession ||
        characteristic !== SONICARE.characteristics.activeSessionId
      ) {
        throw missingCharacteristic(characteristic);
      }
      const bytes = toByteArray(value);
      this.selected = (bytes[0] ?? 0) | ((bytes[1] ?? 0) << 8);
      return {};
    },
  );

  monitorCharacteristicForService(
    _service: string,
    characteristic: string,
    callback: Notification,
  ) {
    this.monitors.set(characteristic, callback);
    return new Subscription();
  }

  onDisconnected(callback: (error: Error | null) => void) {
    this.disconnected = callback;
    return new Subscription();
  }

  notify(characteristic: string, bytes: number[]): void {
    this.monitors.get(characteristic)?.(null, { value: b64(bytes) });
  }

  /** Emits the handle notifications observed for a connected brushing session. */
  brushLive(
    seconds: number,
    options: { wipeTimerBeforeStop?: boolean } = {},
  ): void {
    this.handleState = 2;
    this.notify(SONICARE.characteristics.handleState, [2]);
    for (let second = 1; second <= seconds; second += 1) {
      this.notify(SONICARE.characteristics.brushingTime, u16(second));
    }
    if (options.wipeTimerBeforeStop) {
      this.notify(SONICARE.characteristics.brushingTime, u16(0));
    }
    this.handleState = 1;
    this.notify(SONICARE.characteristics.handleState, [1]);
    if (!options.wipeTimerBeforeStop) {
      this.notify(SONICARE.characteristics.brushingTime, u16(0));
    }
  }

  /** Makes a completed session available on the handle at a later sync. */
  file(sessionId: number, record: AuditKidsRecord): void {
    this.records.set(sessionId, {
      stamp: record.stamp,
      duration: record.duration ?? 120,
      target: record.target ?? 120,
    });
  }

  emitDisconnect(error: Error | null = null): void {
    this.disconnected?.(error);
  }
}

export class AuditKidsManager {
  constructor(readonly device: AuditHx6340KidsDevice) {}

  stopDeviceScan = vi.fn();
  cancelTransaction = vi.fn(async () => undefined);
  destroy = vi.fn();
  onStateChange = vi.fn((callback: (state: string) => void) => {
    callback("PoweredOn");
    return new Subscription();
  });
  startDeviceScan = vi.fn(
    (
      _uuids: unknown,
      _options: unknown,
      callback: (error: Error | null, device: AuditHx6340KidsDevice) => void,
    ) => {
      callback(null, this.device);
    },
  );
}
