import { describe, expect, it } from "vitest";

import { mergeFamilyProfiles, parseFamilyBackup } from "@/lib/family-backup-format";

const file = (children: unknown[], profiles: unknown[] = [
  { id: "primary", name: "Emma", createdAt: 1 },
  { id: "child-luca", name: "Luca", createdAt: 2 },
]) => JSON.stringify({ format: "brushlings-family", version: 1, createdAt: 5, profiles, children });

describe("backup di tutta la famiglia (voce 69)", () => {
  it("legge un file con più bambini e scarta le voci rovinate", () => {
    const backup = parseFamilyBackup(file([
      { profileId: "primary", name: "x", sessionCount: 3, database: "U1FMaXRl" },
      { profileId: "child-luca", name: "Luca", sessionCount: 1, database: "U1FMaXRl" },
      { profileId: "child-ghost", name: "?", sessionCount: 1, database: "U1FMaXRl" },
      { profileId: "child-luca", name: "Luca", sessionCount: -1, database: "!!" },
    ]));
    expect(backup.children.map((child) => child.profileId)).toEqual(["primary", "child-luca"]);
    expect(backup.children[0].name).toBe("Emma");
    expect(() => parseFamilyBackup("{")).toThrow();
    expect(() => parseFamilyBackup(JSON.stringify({ format: "brushlings-backup", version: 3 }))).toThrow();
    expect(() => parseFamilyBackup(file([]))).toThrow();
  });

  it("unisce i bambini del file a quelli del telefono senza superare il limite", () => {
    const backup = parseFamilyBackup(file([
      { profileId: "primary", name: "Emma", sessionCount: 3, database: "U1FMaXRl" },
      { profileId: "child-luca", name: "Luca", sessionCount: 1, database: "U1FMaXRl" },
    ]));
    const current = { version: 1 as const, activeId: "primary", profiles: [{ id: "primary", name: "Bimbo", createdAt: 9 }, { id: "child-sara", name: "Sara", createdAt: 9 }] };
    const { family, restored } = mergeFamilyProfiles(current, backup);
    expect(family.profiles.map((profile) => `${profile.id}:${profile.name}`)).toEqual(["primary:Emma", "child-sara:Sara", "child-luca:Luca"]);
    expect(restored).toEqual(["primary", "child-luca"]);
    const full = { ...current, profiles: Array.from({ length: 8 }, (_, index) => ({ id: index ? `child-${index}` : "primary", name: `B${index}`, createdAt: 1 })) };
    expect(mergeFamilyProfiles(full, backup).restored).toEqual(["primary"]);
  });
});
