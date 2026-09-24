import { expect, test, type Page } from "@playwright/test";

async function completeFirstRun(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("starter-chooser")).toBeVisible();
  await page.getByTestId("starter-bloopi").click();
  await page.getByTestId("starter-confirm").click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

test.describe("percorso funzionale web", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("completa una sessione, mostra la ricompensa e conserva lo storico dopo reload", async ({
    page,
  }) => {
    await completeFirstRun(page);

    const timer = page.getByTestId("manual-timer");
    await expect(timer).toHaveAttribute("aria-valuemax", "5");
    await page.getByTestId("manual-start-stop").click();

    const reward = page.getByTestId("session-reward-modal");
    await expect(reward).toBeVisible({ timeout: 15_000 });
    await expect(reward).toHaveAttribute("role", "dialog");
    await page.getByTestId("session-reward-dismiss").click();

    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("history-screen")).toBeVisible();
    await expect(page.getByTestId("history-session-0")).toContainText("0:05");

    await page.reload();
    await expect(page.getByTestId("history-session-0")).toContainText("0:05");
  });

  test("conserva la checklist hardware e valida il fallback backup web", async ({
    page,
  }) => {
    await completeFirstRun(page);

    await page.getByTestId("tab-device").click();
    await page.getByTestId("device-hardware-test").click();
    await expect(page.getByTestId("hardware-test-screen")).toBeVisible();
    await page.getByTestId("hardware-status-scan-connect-passed").click();
    await expect(page.getByTestId("hardware-checklist-saved-1")).toBeVisible();

    await page.reload();
    await expect(
      page.getByTestId("hardware-status-scan-connect-passed-selected"),
    ).toBeVisible();

    await page.getByTestId("tab-device").click();
    await page.getByTestId("device-backup").click();
    await expect(page.getByTestId("backup-screen")).toBeVisible();
    await expect(page.getByTestId("backup-export")).toBeDisabled();
    await page.getByTestId("backup-import-code").fill("backup-non-valido");
    await page.getByTestId("backup-inspect-code").click();
    await expect(page.getByTestId("backup-error")).toBeVisible();
  });

  test("cambia lingua immediatamente e conserva la scelta dopo reload", async ({
    page,
  }) => {
    await completeFirstRun(page);
    await page.goto("/settings");

    const languages = [
      {
        code: "en",
        option: "English",
        title: "Settings",
        deviceTitle: "Toothbrush",
      },
      {
        code: "de",
        option: "Deutsch",
        title: "Einstellungen",
        deviceTitle: "Zahnbürste",
      },
      {
        code: "fr",
        option: "Français",
        title: "Paramètres",
        deviceTitle: "Brosse à dents",
      },
      {
        code: "es",
        option: "Español",
        title: "Ajustes",
        deviceTitle: "Cepillo",
      },
      {
        code: "it",
        option: "Italiano",
        title: "Impostazioni",
        deviceTitle: "Spazzolino",
      },
    ] as const;

    for (const language of languages) {
      await page.getByRole("radio", { name: language.option }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", language.code);
      await expect(
        page.getByText(language.title, { exact: true }).first(),
      ).toBeVisible();
      await page.getByTestId("tab-device").click();
      await expect(
        page.getByText(language.deviceTitle, { exact: true }).first(),
      ).toBeVisible();
      await page.goto("/settings");
    }

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await expect(page.getByRole("radio", { name: "Italiano" })).toBeChecked();
    await expect(
      page.getByText("Impostazioni", { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole("radio", { name: "Sistema" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    await page.reload();
    await expect(page.getByRole("radio", { name: "Sistema" })).toBeChecked();
  });
});
