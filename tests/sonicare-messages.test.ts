import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { translateDynamic } from "@/lib/i18n";
import { localizeSonicareMessage } from "@/lib/sonicare-message-i18n";

const clientSource = fs.readFileSync(
  new URL("../lib/sonicare-client.native.ts", import.meta.url),
  "utf8",
);

// Plain string literals the native client shows as status, writes to the diagnostic log or
// throws to the provider. Template literals are covered by the pattern-based translations.
const clientMessages = [
  ...clientSource.matchAll(
    /(?:onLog\(\s*"(?:info|success|warning|error)",|onStatus\(\s*"[a-z]+",|new Error\()\s*"([^"]+)"/g,
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
