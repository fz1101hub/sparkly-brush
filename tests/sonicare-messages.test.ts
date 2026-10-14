import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { translateDynamic } from "@/lib/i18n";
import { localizeSonicareMessage, sonicareMessageKey } from "@/lib/sonicare-message-i18n";

const clientSource = fs.readFileSync(
  new URL("../lib/sonicare-client.native.ts", import.meta.url),
  "utf8",
);

// Plain string literals the native client shows as status, writes to the diagnostic log or
// throws to the provider, plus the scan and BLE error code tables. Template literals are covered
// by the pattern-based translations.
const clientMessages = [
  ...clientSource.matchAll(
    /(?:onLog\(\s*"(?:info|success|warning|error)",|onStatus\(\s*"[a-z]+",|new Error\(|\b(?:prompt|started|notFound|ignored|\d+):)\s*"([^"]+)"/g,
  ),
].map((match) => match[1]);

describe("messaggi del client BLE", () => {
  it("ogni messaggio del client ha una traduzione", () => {
    expect(clientMessages.length).toBeGreaterThan(20);
    const english = (message: string) =>
      localizeSonicareMessage(message, (key, params) => translateDynamic("en", key, params));
    expect(clientMessages.filter((message) => english(message) === message)).toEqual([]);
  });
});

describe("sonicareMessageKey", () => {
  it("restituisce la chiave solo per i messaggi esatti del client", () => {
    expect(sonicareMessageKey("Autorizzazione Bluetooth non concessa")).toBe("brush.client.permissionDenied");
    expect(sonicareMessageKey("Bluetooth spento: attivalo e riprova")).toBe("brush.client.poweredOff");
    expect(sonicareMessageKey("Trovato Sonicare4Kids")).toBeNull();
    expect(sonicareMessageKey("toString")).toBeNull();
  });
});
