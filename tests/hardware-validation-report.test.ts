import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { exportHardwareValidationReport as exportNative } from "@/lib/hardware-validation-report.native";
import { exportHardwareValidationReport as exportWeb } from "@/lib/hardware-validation-report.web";

const native = vi.hoisted(() => ({
  created: vi.fn(),
  written: vi.fn(),
  deleted: vi.fn(),
  available: vi.fn(),
  shared: vi.fn(),
}));

vi.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class MockFile {
    uri: string;
    exists = true;

    constructor(_base: string, name: string) {
      this.uri = `file:///cache/${name}`;
    }

    create(options: unknown) { native.created(options); }
    write(content: string) { native.written(content); }
    delete() { native.deleted(this.uri); this.exists = false; }
  },
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: native.available,
  shareAsync: native.shared,
}));

describe("hardware validation report export", () => {
  beforeEach(() => {
    native.created.mockReset();
    native.written.mockReset();
    native.deleted.mockReset();
    native.available.mockReset().mockResolvedValue(true);
    native.shared.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("crea, condivide e mantiene il file disponibile allo share sheet nativo", async () => {
    await exportNative("report.md", "# report");

    expect(native.created).toHaveBeenCalledWith({ overwrite: true, intermediates: true });
    expect(native.written).toHaveBeenCalledWith("# report");
    expect(native.shared).toHaveBeenCalledWith("file:///cache/report.md", expect.objectContaining({
      mimeType: "text/markdown",
    }));
    expect(native.deleted).not.toHaveBeenCalled();
  });

  it("cancella il file nativo anche quando la condivisione non è disponibile", async () => {
    native.available.mockResolvedValueOnce(false);
    await expect(exportNative("report.md", "# report")).rejects.toThrow("non è disponibile");
    expect(native.deleted).toHaveBeenCalledWith("file:///cache/report.md");
  });

  it("scarica il report via Blob sul web e revoca l’URL temporaneo", async () => {
    const click = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const anchor = { href: "", download: "", style: { display: "" }, click, remove };
    const createObjectURL = vi.fn().mockReturnValue("blob:report");
    const revokeObjectURL = vi.fn();

    vi.stubGlobal("document", {
      createElement: vi.fn().mockReturnValue(anchor),
      body: { appendChild },
    });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    await exportWeb("report.md", "# report");

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.href).toBe("blob:report");
    expect(anchor.download).toBe("report.md");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
  });
});
