import type {
  BleClientEvents,
  DeviceSyncCursor,
  ScanTarget,
  SonicareClient,
  StoredDeviceSession,
} from "@/lib/brush-types";

class WebSonicareClient implements SonicareClient {
  constructor(private readonly events: BleClientEvents) {}

  async initialize(): Promise<void> {
    this.events.onAdapterState("WebPreview");
    this.events.onStatus("unsupported", "Il Bluetooth si attiva nell’app installata");
    this.events.onLog("info", "Anteprima web: timer manuale disponibile, BLE riservato a iOS e Android");
  }

  async scanAndConnect(_target?: ScanTarget): Promise<void> {
    this.events.onStatus("unsupported", "Apri una development build su iPhone o Android");
    this.events.onLog("warning", "La Web Bluetooth API non è usata: il protocollo richiede l’app nativa");
  }

  async disconnect(): Promise<void> {
    this.events.onStatus("unsupported", "Il Bluetooth si attiva nell’app installata");
  }

  async syncStoredSessionsSince(_cursor?: DeviceSyncCursor | null): Promise<StoredDeviceSession[]> {
    this.events.onLog("warning", "Sincronizzazione disponibile solo su iOS e Android");
    return [];
  }

  destroy(): void {}
}

export function createSonicareClient(events: BleClientEvents): SonicareClient {
  return new WebSonicareClient(events);
}
