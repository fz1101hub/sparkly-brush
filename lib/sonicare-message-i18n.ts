import type { TranslationKey, TranslationParams } from "@/lib/i18n";

type Translator = (key: TranslationKey, params?: TranslationParams) => string;

const EXACT_MESSAGES: Record<string, TranslationKey> = {
  "Accendi lo spazzolino e tienilo vicino": "brush.client.scanPrompt",
  "Scansione BLE avviata (Sonicare4Kids)": "brush.client.scanStarted",
  "Connessione e lettura dei servizi": "brush.client.connecting",
  "Sonicare pronto": "brush.client.ready",
  "Connessione completata: GATT aperto HX63xx": "brush.client.connected",
  "Connessione completata: GATT Sonicare aperto": "brush.client.connected",
  "Spazzolino disconnesso": "brush.client.disconnected",
  "Connessione Bluetooth terminata": "brush.client.connectionEnded",
  "Conteggio storico BLE non disponibile; sincronizzazione prudente":
    "brush.client.historyCountUnavailable",
  "Impossibile leggere sessionCount BLE; sincronizzazione prudente":
    "brush.client.historyCountUnavailable",
  "Prima sincronizzazione limitata all'ultima sessione: le sessioni precedenti non vengono recuperate":
    "brush.client.firstSyncLimited",
  "Payload sessionCount BLE non valido; cursore invariato":
    "brush.client.invalidCountPayload",
  "Clock del manico non disponibile: data sessione approssimata":
    "brush.client.clockUnavailable",
  Disconnesso: "brush.client.disconnectedShort",
  "Il Bluetooth si attiva nell’app installata": "brush.client.unsupported",
  "Anteprima web: timer manuale disponibile, BLE riservato a iOS e Android":
    "brush.client.webPreview",
  "Apri una development build su iPhone o Android":
    "brush.client.openDevelopmentBuild",
  "La Web Bluetooth API non è usata: il protocollo richiede l’app nativa":
    "brush.client.nativeProtocolRequired",
  "Sincronizzazione disponibile solo su iOS e Android":
    "brush.client.syncNativeOnly",
  "Autorizzazione Bluetooth non concessa": "brush.client.permissionDenied",
  "Bluetooth spento: attivalo e riprova": "brush.client.poweredOff",
  "Bluetooth non supportato da questo dispositivo": "brush.client.bluetoothUnsupported",
  "Bluetooth non pronto: controlla che sia acceso e autorizzato": "brush.client.adapterNotReady",
  "Autorizzazione posizione necessaria per la scansione BLE":
    "brush.client.locationPermissionRequired",
  "Connessione Bluetooth già in corso": "brush.client.connectionInProgress",
  "Client Bluetooth non disponibile": "brush.client.unavailable",
  "Connessione Bluetooth annullata": "brush.client.cancelled",
  "Sincronizzazione Bluetooth annullata": "brush.client.cancelled",
  "Errore Bluetooth sconosciuto": "brush.client.unknownError",
  "Spazzolino non trovato. Accendilo e riprova.": "brush.client.notFound",
  "Manico abbinato non trovato. Accendilo e tienilo vicino, oppure cambia manico.":
    "brush.client.pairedNotFound",
  "Nessun altro manico trovato. Accendi il nuovo manico e tienilo vicino.":
    "brush.client.otherNotFound",
  "Accendi il nuovo manico e tienilo vicino": "brush.client.scanPromptReplace",
  "Scansione BLE avviata: cerco il manico abbinato": "brush.client.scanStartedPaired",
  "Scansione BLE avviata: cerco un altro manico": "brush.client.scanStartedReplace",
  "Trovato un altro manico: ignorato finché non cambi manico": "brush.client.otherHandleIgnored",
  "Manico già abbinato ignorato: accendi il nuovo manico": "brush.client.pairedHandleIgnored",
  "Manico di un altro profilo ignorato": "brush.client.siblingHandleIgnored",
  "Spazzolino associato a un altro profilo": "device.error.handleOwnedByOtherProfile",
  "Operazione Bluetooth scaduta: riprova": "brush.client.operationTimedOut",
  "Connessione allo spazzolino non riuscita: riprova": "brush.client.connectionFailedRetry",
  "Impossibile avviare la scansione Bluetooth: riprova tra poco": "brush.client.scanStartFailed",
  "Attiva la Localizzazione nelle impostazioni di Android: serve per la scansione Bluetooth":
    "brush.client.locationServicesDisabled",
  "Conteggio storico BLE non disponibile: il cursore resta invariato per evitare sessioni perse":
    "brush.client.historyCountUnavailable",
  "Conteggio storico BLE non disponibile: il reset non può essere verificato":
    "brush.client.historyCountUnavailable",
  "Il contatore del manico sembra essere stato azzerato: usa ‘Dimentica manico resettato’":
    "brush.client.resetDetected",
  "Lo storico del manico non contiene più tutte le sessioni mancanti":
    "brush.client.incompleteHistory",
  "Collega prima lo spazzolino": "brush.error.connectFirst",
  "Nessun contatore BLE precedente da reimpostare per questo manico":
    "brush.error.noCounterToReset",
};

const HANDLE_STATES: Record<string, TranslationKey> = {
  spento: "device.handleState.off",
  "in attesa": "device.handleState.idle",
  spazzolamento: "device.handleState.brushing",
  "in carica": "device.handleState.charging",
  spegnimento: "device.handleState.shuttingDown",
  verifica: "device.handleState.verifying",
  background: "device.handleState.background",
};

const UNRECOVERABLE_GAP_PATTERNS = [
  /^Il manico espone \d+ sessioni: sincronizzazione oltre il limite sicuro$/,
  /^Intervallo BLE non sicuro \(\d+ sessioni\): il cursore non è stato avanzato$/,
  /^Lo storico del manico non contiene più tutte le sessioni mancanti$/,
];

/** True when a sync stopped because the handle holds more than one batch can recover (audit B4). */
export function isUnrecoverableGapMessage(message: string): boolean {
  return UNRECOVERABLE_GAP_PATTERNS.some((pattern) => pattern.test(message));
}

/** The translation key of an exact client message, for screens that react to a specific state. */
export function sonicareMessageKey(message: string): TranslationKey | null {
  return Object.prototype.hasOwnProperty.call(EXACT_MESSAGES, message) ? EXACT_MESSAGES[message] : null;
}

/** Only known protocol messages may be promoted to primary user feedback. */
export function isKnownSonicareMessage(message: string): boolean {
  return Object.prototype.hasOwnProperty.call(EXACT_MESSAGES, message)
    || /^(?:Il manico espone \d+ sessioni: sincronizzazione oltre il limite sicuro|Intervallo BLE non sicuro \(\d+ sessioni\): il cursore non è stato avanzato|Record BLE \d+ mancante o non riconosciuto; cursore invariato)$/.test(message)
    || /^(?:\d+ servizi GATT rilevati|\d+ sessioni BLE pronte per il salvataggio atomico)$/.test(message)
    || /^Riallineamento: \d+ sessioni del manico non recuperabili saltate$/.test(message);
}

export function localizeSonicareMessage(
  message: string,
  t: Translator,
): string {
  const exactKey = EXACT_MESSAGES[message];
  if (exactKey) return t(exactKey);

  let match = /^Bluetooth: (.+)$/.exec(message);
  if (match) return t("brush.client.bluetoothState", { state: match[1] });

  match = /^Trovato (.+)$/.exec(message);
  if (match) return t("brush.client.found", { name: match[1] });

  match = /^(\d+) servizi GATT rilevati$/.exec(message);
  if (match) return t("brush.client.servicesFound", { count: match[1] });

  match = /^Stato manico: (.+)$/.exec(message);
  if (match) {
    const state = HANDLE_STATES[match[1]]
      ? t(HANDLE_STATES[match[1]])
      : match[1];
    return t("brush.client.handleState", { state });
  }

  match = /^Notifica non disponibile: (.+)$/.exec(message);
  if (match)
    return t("brush.client.notificationUnavailable", { code: match[1] });

  match = /^Lettura opzionale non disponibile: (.+)$/.exec(message);
  if (match)
    return t("brush.client.optionalReadUnavailable", { code: match[1] });

  match = /^Sessione (.+) letta \((\d+)s\)$/.exec(message);
  if (match) {
    return t("brush.client.sessionRead", { id: match[1], duration: match[2] });
  }

  match = /^(\d+) sessioni BLE pronte per il salvataggio atomico$/.exec(
    message,
  );
  if (match) return t("brush.client.sessionsReady", { count: match[1] });

  match = /^Riallineamento: (\d+) sessioni del manico non recuperabili saltate$/.exec(message);
  if (match) return t("brush.client.gapSkipped", { count: match[1] });

  match =
    /^Il manico espone (\d+) sessioni: sincronizzazione oltre il limite sicuro$/.exec(
      message,
    );
  if (match) return t("brush.client.syncLimit", { count: match[1] });

  match =
    /^Intervallo BLE non sicuro \((\d+) sessioni\): il cursore non è stato avanzato$/.exec(
      message,
    );
  if (match) return t("brush.client.unsafeGap", { count: match[1] });

  match =
    /^Record BLE (.+) mancante o non riconosciuto; cursore invariato$/.exec(
      message,
    );
  if (match) return t("brush.client.missingRecord", { id: match[1] });

  return message;
}
