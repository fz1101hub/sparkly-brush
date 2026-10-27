import { afterEach, describe, expect, it, vi } from "vitest";

const rn = vi.hoisted(() => ({
  Platform: { OS: "ios" as string },
  Alert: { alert: vi.fn() },
}));

vi.mock("react-native", () => rn);

import { confirmDestructive, showMessage } from "@/lib/dialogs";

type AlertButton = { text: string; style?: string; onPress?: () => void };

const confirmation = {
  title: "Svuotare lo storico?",
  message: "L'operazione non si può annullare.",
  cancelLabel: "Annulla",
  confirmLabel: "Elimina",
};

describe("dialoghi multipiattaforma", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    rn.Alert.alert.mockReset();
  });

  it("sul web usa confirm(), perché Alert.alert di react-native-web non fa nulla", () => {
    rn.Platform.OS = "web";
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    const onConfirm = vi.fn();

    confirmDestructive({ ...confirmation, onConfirm });
    expect(onConfirm).not.toHaveBeenCalled();
    confirmDestructive({ ...confirmation, onConfirm });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith("Svuotare lo storico?\n\nL'operazione non si può annullare.");
    expect(rn.Alert.alert).not.toHaveBeenCalled();

    const alert = vi.fn();
    vi.stubGlobal("alert", alert);
    showMessage("Errore", "Riprova più tardi");
    expect(alert).toHaveBeenCalledWith("Errore\n\nRiprova più tardi");
  });

  it("su iOS e Android mostra un Alert con pulsante distruttivo", () => {
    rn.Platform.OS = "android";
    const onConfirm = vi.fn();
    confirmDestructive({ ...confirmation, onConfirm });

    const [title, message, buttons] = rn.Alert.alert.mock.calls[0] as [string, string, AlertButton[]];
    expect(title).toBe(confirmation.title);
    expect(message).toBe(confirmation.message);
    expect(buttons.map((button) => [button.text, button.style])).toEqual([
      ["Annulla", "cancel"],
      ["Elimina", "destructive"],
    ]);
    buttons[1].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    showMessage("Errore", "Riprova più tardi");
    expect(rn.Alert.alert).toHaveBeenLastCalledWith("Errore", "Riprova più tardi");
  });
});
