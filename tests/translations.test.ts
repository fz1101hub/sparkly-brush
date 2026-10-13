import { describe, expect, it } from "vitest";

import { de } from "@/locales/de";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { fr } from "@/locales/fr";
import { it as itCatalog } from "@/locales/it";

const catalogs = { it: itCatalog, en, de, fr, es } as const;
const EVOLUTION_TITLE_KEYS = Object.keys(itCatalog).filter((key) =>
  /^game\.brushling\..+\.evolution\.\d+\.title$/.test(key),
) as (keyof typeof itCatalog)[];

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

describe("translation catalogs", () => {
  const sourceKeys = Object.keys(itCatalog).sort();

  it("preserva almeno le 874 chiavi localizzate del candidato", () => {
    expect(sourceKeys.length).toBeGreaterThanOrEqual(874);
  });

  it.each(Object.entries(catalogs))(
    "%s ha tutte e sole le chiavi italiane",
    (_locale, catalog) => {
      expect(Object.keys(catalog).sort()).toEqual(sourceKeys);
    },
  );

  it.each(Object.entries(catalogs))(
    "%s non contiene caratteri invisibili",
    (_locale, catalog) => {
      expect(
        Object.entries(catalog).filter(([, value]) => /[\u200B-\u200D\u2060\uFEFF]/.test(value)),
      ).toEqual([]);
    },
  );

  it("usa un solo termine tedesco per il manico e cita i pulsanti con il loro nome reale", () => {
    expect(Object.values(de).filter((value) => value.includes("Handstück"))).toEqual([]);
    expect(de["brush.client.resetDetected"]).toContain(`„${de["device.forgetResetLabel"]}“`);
  });

  it.each(Object.entries(catalogs))(
    "%s non contiene traduzioni vuote",
    (_locale, catalog) => {
      expect(
        Object.entries(catalog).filter(
          ([, value]) => value.trim().length === 0,
        ),
      ).toEqual([]);
    },
  );

  for (const [locale, catalog] of Object.entries(catalogs)) {
    it(`${locale} preserva tutti i placeholder`, () => {
      const mismatches = sourceKeys.filter(
        (key) =>
          JSON.stringify(
            placeholders(itCatalog[key as keyof typeof itCatalog]),
          ) !==
          JSON.stringify(
            placeholders(catalog[key as keyof typeof catalog] as string),
          ),
      );
      expect(mismatches).toEqual([]);
    });
  }

  it.each(Object.entries({ en, de, fr, es }))(
    "%s localizza tutti i titoli evolutivi",
    (_locale, catalog) => {
      expect(EVOLUTION_TITLE_KEYS).toHaveLength(11);
      EVOLUTION_TITLE_KEYS.forEach((key) => {
        expect(catalog[key]).not.toBe(itCatalog[key]);
      });
    },
  );
});
