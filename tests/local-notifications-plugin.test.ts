import { describe, expect, it } from "vitest";

import config from "../app.config";
import { removePushEntitlement } from "../plugins/with-local-notifications-only";

describe("promemoria solo locali su iOS", () => {
  it("toglie l'entitlement push e conserva gli altri", () => {
    expect(removePushEntitlement({
      "aps-environment": "development",
      "com.apple.developer.icloud-services": ["CloudDocuments"],
    })).toEqual({ "com.apple.developer.icloud-services": ["CloudDocuments"] });
  });

  it("è dichiarato prima di expo-notifications, così gira dopo di esso", () => {
    const names = (config.plugins ?? []).map((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin));
    const own = names.indexOf("./plugins/with-local-notifications-only");
    expect(own).toBeGreaterThanOrEqual(0);
    expect(own).toBeLessThan(names.indexOf("expo-notifications"));
  });
});
