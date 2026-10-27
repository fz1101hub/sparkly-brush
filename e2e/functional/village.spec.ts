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

/** Answers the question on screen, whatever its kind: the first answer, or the items in a row. */
async function answerQuestion(page: Page) {
  const firstItem = page.getByTestId("quiz-item-0");
  await expect(page.getByTestId("quiz-answer-0").or(firstItem)).toBeVisible();
  if (await firstItem.isVisible()) {
    for (let item = 0; item < 3; item += 1) await page.getByTestId(`quiz-item-${item}`).click();
  } else {
    await page.getByTestId("quiz-answer-0").click();
  }
}

async function brushOnce(page: Page) {
  await page.goto("/");
  await page.getByTestId("manual-start-stop").click();
  await expect(page.getByTestId("session-reward-modal")).toBeVisible({ timeout: 15_000 });
  await page.getByTestId("session-reward-dismiss").click();
}

test.describe("villaggio dei Brushling", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("l'energia arriva solo spazzolando e un giro di quiz la consuma", async ({ page }) => {
    await completeFirstRun(page);

    await page.goto("/quiz");
    await expect(page.getByTestId("village-energy")).toContainText("0 su 4");
    await page.getByTestId("quiz-start").click();
    await expect(page.getByTestId("village-no-energy")).toBeVisible();

    await brushOnce(page);
    await page.getByTestId("tab-world").click();
    await expect(page.getByTestId("village-energy")).toContainText("2 su 4");
    await page.getByTestId("village-quiz").click();
    await expect(page.getByTestId("quiz-screen")).toBeVisible();

    await page.getByTestId("quiz-start").click();
    for (let question = 0; question < 3; question += 1) {
      await answerQuestion(page);
      await expect(page.getByTestId("quiz-feedback")).toBeVisible();
      await page.getByTestId("quiz-next").click();
    }
    await expect(page.getByTestId("quiz-result")).toContainText("su 3");

    await page.getByTestId("quiz-museum").click();
    await expect(page.getByTestId("museum-count")).toBeVisible();

    await page.goto("/quiz");
    await expect(page.getByTestId("village-energy")).toContainText("1 su 4");
  });

  test("esplorando un dente mostra il nome in italiano e nella lingua scelta", async ({ page }) => {
    await completeFirstRun(page);

    await page.goto("/tooth-names");
    await page.getByTestId("tooth-language-de").click();
    await page.getByTestId("tooth-upper-right-0").click();
    await expect(page.getByTestId("tooth-name-local")).toHaveText(/incisivo centrale/i);
    await expect(page.getByTestId("tooth-name-learning")).toContainText("mittlerer Schneidezahn");

    await page.getByTestId("tooth-dentition-permanent").click();
    await page.getByTestId("tooth-fdi").click();
    await page.getByTestId("tooth-upper-left-5").click();
    await expect(page.getByTestId("tooth-fdi-number")).toHaveText("Numero FDI: 26");
    await expect(page.getByTestId("tooth-six-year")).toBeVisible();

    await page.getByTestId("tooth-mode-repeat").click();
    await page.getByTestId("tooth-repeat-start").click();
    await expect(page.getByTestId("tooth-repeat-word")).toBeVisible();
    for (let tooth = 0; tooth < 6; tooth += 1) await page.getByTestId("tooth-repeat-said").click();
    await expect(page.getByTestId("tooth-repeat-result")).toContainText("6 nomi in tedesco");
  });

  test("la modalità apparecchio guida la cura e mette l'apparecchio alla creatura", async ({ page }) => {
    await completeFirstRun(page);

    await page.goto("/braces");
    await page.getByTestId("braces-enable").click();
    await expect(page.getByTestId("creature-braces").first()).toBeAttached();

    await page.getByTestId("braces-start-care").click();
    await expect(page.getByTestId("braces-step-timer")).toBeVisible();
    await page.getByTestId("braces-step-done").click();
    await expect(page.getByTestId("braces-step")).toBeVisible();
    await page.getByTestId("braces-step-done").click();
    await expect(page.getByTestId("braces-done")).toBeVisible();
    await expect(page.getByTestId("braces-streak")).toContainText("1 giorno");

    await page.reload();
    await expect(page.getByTestId("braces-streak")).toContainText("1 giorno");
    await page.goto("/");
    await expect(page.getByTestId("creature-braces").first()).toBeAttached();
  });

  test("un vecchio codice di backup lascia apparecchio e carte come sono", async ({ page }) => {
    await completeFirstRun(page);
    await page.goto("/braces");
    await page.getByTestId("braces-enable").click();
    await expect(page.getByTestId("braces-start-care")).toBeVisible();

    const legacyCode = `BRUSHLINGS-BACKUP-1:${JSON.stringify({
      format: "brushlings-backup",
      version: 1,
      createdAt: Date.now(),
      profile: { selectedId: "spriggo", hasChosenStarter: true },
      customization: { ownedIds: ["bubble-room"] },
      history: [],
    })}`;
    await page.goto("/backup");
    await expect(page.getByTestId("backup-current-cards")).toHaveText("0");
    await page.getByTestId("backup-import-code").fill(legacyCode);
    await page.getByTestId("backup-inspect-code").click();
    const comparison = page.getByTestId("backup-comparison-legacy");
    await expect(comparison).toContainText("Carte del museo");
    await expect(comparison).toContainText("Apparecchio fisso");
    await expect(comparison).toContainText("Resta com’è");
    await page.getByTestId("backup-restore-legacy").click();
    await page.getByTestId("backup-confirm-legacy").click();
    await expect(page.getByTestId("backup-status")).toBeVisible();

    await page.goto("/braces");
    await expect(page.getByTestId("braces-start-care")).toBeVisible();
  });
});
