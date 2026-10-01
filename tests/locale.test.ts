import { describe, expect, it } from "vitest";

import {
  formatNumber,
  translate,
  translateDynamic,
  type Translate,
} from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  isLanguagePreference,
  normalizeLocale,
  resolveLocale,
} from "@/lib/locale-types";
import { isKnownSonicareMessage, localizeSonicareMessage } from "@/lib/sonicare-message-i18n";

if (false) {
  // @ts-expect-error La chiave richiede il placeholder `error`.
  translate("it", "recovery.restart");
  // @ts-expect-error I nomi placeholder errati devono fallire il typecheck.
  translate("it", "recovery.restart", { typo: "errore" });
  // @ts-expect-error Le chiavi senza placeholder non accettano parametri arbitrari.
  translate("it", "common.retry", { value: 1 });
}

describe("locale resolution", () => {
  it.each([
    ["it-IT", "it"],
    ["en-US", "en"],
    ["de_DE", "de"],
    ["fr-CA", "fr"],
    ["es-MX", "es"],
    ["ja-JP", null],
    [null, null],
  ] as const)("normalizza %s", (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it("usa italiano come fallback e rispetta l'override manuale", () => {
    expect(DEFAULT_LOCALE).toBe("it");
    expect(resolveLocale("system", "de")).toBe("de");
    expect(resolveLocale("fr", "de")).toBe("fr");
  });

  it.each(["system", "it", "en", "de", "fr", "es"])(
    "accetta la preferenza %s",
    (preference) => {
      expect(isLanguagePreference(preference)).toBe(true);
    },
  );

  it("rifiuta preferenze sconosciute", () => {
    expect(isLanguagePreference("pt")).toBe(false);
    expect(isLanguagePreference(42)).toBe(false);
  });
});

describe("translation runtime", () => {
  it("interpola i parametri e usa il catalogo richiesto", () => {
    expect(translate("it", "recovery.restart", { error: "Errore" })).toBe(
      "Errore. Riavvia l’app senza cancellarne i dati.",
    );
    expect(translate("en", "common.retry")).toBe("Try again");
    expect(
      formatNumber("de", 1.5, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    ).toBe("1,5");
  });

  it("localizza messaggi BLE statici e parametrizzati", () => {
    const english: Translate = (key, params) =>
      translateDynamic("en", key, params);

    expect(
      localizeSonicareMessage(
        "Accendi lo spazzolino e tienilo vicino",
        english,
      ),
    ).toBe("Turn on the toothbrush and keep it nearby");
    expect(localizeSonicareMessage("3 servizi GATT rilevati", english)).toBe(
      "3 GATT services found",
    );
    expect(
      localizeSonicareMessage(
        "Intervallo BLE non sicuro (7 sessioni): il cursore non è stato avanzato",
        english,
      ),
    ).toBe("Unsafe Bluetooth gap (7 sessions): synchronization paused");
    expect(
      localizeSonicareMessage("Errore Bluetooth sconosciuto", english),
    ).toBe("Unknown Bluetooth error");
    const resetFailure = "Nessun contatore BLE precedente da reimpostare per questo manico";
    expect(isKnownSonicareMessage(resetFailure)).toBe(true);
    expect(localizeSonicareMessage(resetFailure, english)).toContain("no previous Bluetooth counter");
    expect(isKnownSonicareMessage("system-native-error Bluetooth 01:02:03:04")).toBe(false);
  });
});
