import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

// The security overrides in pnpm-workspace.yaml can move transitive dependencies outside the
// ranges their dependents declare; these checks run the real installed modules.
describe("compatibilità delle dipendenze runtime con gli override di sicurezza", () => {
  it("query-string di expo-router decodifica i parametri con decode-uri-component 0.5 (solo ESM)", () => {
    const expoRouter = path.dirname(require.resolve("expo-router/package.json"));
    const queryString = require(require.resolve("query-string", { paths: [expoRouter] })) as {
      parse: (query: string) => Record<string, unknown>;
      stringify: (value: Record<string, unknown>) => string;
    };

    expect(queryString.parse("a=%20b&f=st%C3%A5le&broken=%E0%A4%A")).toEqual({
      a: " b",
      broken: "%E0%A4%A",
      f: "ståle",
    });
    expect(queryString.stringify({ q: "spazzolino & dentini" })).toBe("q=spazzolino%20%26%20dentini");
  });
});
