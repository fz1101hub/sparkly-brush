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

  test("svuota lo storico sul web solo dopo la conferma", async ({ page }) => {
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("session-reward-dismiss").click();

    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("history-session-0")).toBeVisible();

    page.once("dialog", (dialog) => void dialog.dismiss());
    await page.getByTestId("history-clear").click();
    await expect(page.getByTestId("history-session-0")).toBeVisible();

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.accept();
    });
    await page.getByTestId("history-clear").click();
    await expect(page.getByText("Il viaggio inizia qui")).toBeVisible();
    await expect(page.getByTestId("history-session-0")).toHaveCount(0);

    await page.reload();
    await expect(page.getByText("Il viaggio inizia qui")).toBeVisible();
  });

  test("dopo Svuota storico conserva gli acquisti e il portafoglio riparte senza debito", async ({
    page,
  }) => {
    const completeSession = async () => {
      await page.goto("/");
      await page.getByTestId("manual-start-stop").click();
      await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("session-reward-dismiss").click();
    };
    // The wallet reads 0 until the reloaded page has hydrated history and progress.
    const readWallet = async () => Number.parseInt(
      (await page.getByTestId("habitat-wallet-value").innerText()).replace(/\D/g, ""),
      10,
    );
    test.setTimeout(120_000);

    await completeFirstRun(page);
    await completeSession();
    await completeSession();
    await page.goto("/habitat");
    await expect.poll(readWallet, { timeout: 15_000 }).toBeGreaterThanOrEqual(28);
    const beforePurchase = await readWallet();
    await page.getByTestId("habitat-item-fresh-garden").click();
    await expect.poll(readWallet).toBe(beforePurchase - 28);

    await page.goto("/history");
    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByTestId("history-clear").click();
    await expect(page.getByText("Il viaggio inizia qui")).toBeVisible();

    await completeSession();
    await page.goto("/habitat");
    await expect.poll(readWallet, { timeout: 15_000 }).toBeGreaterThanOrEqual(12);
    await expect(page.getByTestId("habitat-item-fresh-garden")).toHaveAccessibleName(/^Equipaggiat/);
  });

  test("rende raggiungibile la chiusura della ricompensa su schermo compatto", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();

    const reward = page.getByTestId("session-reward-modal");
    await expect(reward).toBeVisible({ timeout: 15_000 });
    const dismiss = page.getByTestId("session-reward-dismiss");
    await dismiss.scrollIntoViewIfNeeded();
    await expect(dismiss).toBeInViewport();
    await dismiss.click();
    await expect(reward).not.toBeVisible();
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

  test("annulla un restore legacy senza perdere dati e importa solo dopo conferma", async ({
    page,
  }) => {
    await completeFirstRun(page);
    await page.getByTestId("manual-start-stop").click();
    await expect(page.getByTestId("session-reward-modal")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("session-reward-dismiss").click();

    const legacyCode = `BRUSHLINGS-BACKUP-1:${JSON.stringify({
      format: "brushlings-backup",
      version: 1,
      createdAt: Date.now(),
      profile: { selectedId: "spriggo", hasChosenStarter: true },
      customization: { ownedIds: ["bubble-room"] },
      preferences: {
        onboardingCompleted: true,
        soundsEnabled: true,
        musicEnabled: false,
        hapticsEnabled: true,
        language: "system",
      },
      history: [
        {
          id: "legacy-imported-session",
          startedAt: Date.now() - 60_000,
          durationSeconds: 120,
          targetSeconds: 120,
          completed: true,
          source: "manual",
        },
      ],
    })}`;

    await page.getByTestId("tab-device").click();
    await page.getByTestId("device-backup").click();
    const olderCode = `BRUSHLINGS-BACKUP-1:${JSON.stringify({
      ...JSON.parse(legacyCode.slice("BRUSHLINGS-BACKUP-1:".length)),
      history: [],
    })}`;
    await page.getByTestId("backup-import-code").fill(olderCode);
    await page.getByTestId("backup-inspect-code").click();
    await expect(
      page.getByTestId("backup-comparison-legacy-older"),
    ).toBeVisible();
    await page.getByTestId("backup-import-code").fill(legacyCode);
    await page.getByTestId("backup-inspect-code").click();
    await expect(page.getByTestId("backup-legacy-preview")).toBeVisible();
    const comparison = page.getByTestId("backup-comparison-legacy");
    await expect(comparison).toContainText("Su questo telefono");
    await expect(comparison).toContainText("Nel backup");
    await expect(comparison).toContainText("Sessioni totali");
    await expect(comparison).toContainText("Sessioni consultabili: 1");
    await expect(comparison).toContainText("Il ripristino non unisce i dati");
    await page.getByTestId("backup-restore-legacy").click();
    await expect(page.getByTestId("backup-confirm-legacy-card")).toBeVisible();
    await page.getByTestId("backup-cancel-legacy").click();
    await expect(page.getByTestId("backup-confirm-legacy-card")).toHaveCount(0);
    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("history-session-0")).toContainText("0:05");
    await page.reload();
    await expect(page.getByTestId("history-session-0")).toContainText("0:05");

    await page.getByTestId("tab-device").click();
    await page.getByTestId("device-backup").click();
    await page.getByTestId("backup-import-code").fill(legacyCode);
    await page.getByTestId("backup-inspect-code").click();
    await expect(
      page.getByTestId("backup-comparison-legacy-older"),
    ).toHaveCount(0);
    await page.getByTestId("backup-restore-legacy").click();
    await page.getByTestId("backup-import-code").fill(`${legacyCode}invalid`);
    await expect(page.getByTestId("backup-confirm-legacy-card")).toHaveCount(0);
    await page.getByTestId("backup-import-code").fill(legacyCode);
    await page.getByTestId("backup-inspect-code").click();
    await page.getByTestId("backup-restore-legacy").click();
    await page.getByTestId("backup-confirm-legacy").click();
    await expect(page.getByTestId("backup-status")).toBeVisible();
    await page.getByTestId("tab-history").click();
    await expect(page.getByTestId("history-session-0")).toContainText("2:00");
    await page.reload();
    await expect(page.getByTestId("history-session-0")).toContainText("2:00");
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
