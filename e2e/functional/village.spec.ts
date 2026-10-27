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

/** The village sleeps in the evening by default: daytime tests switch the rest off. */
async function keepVillageAwake(page: Page) {
  await page.goto("/settings");
  const night = page.getByTestId("village-night");
  await expect(night).toBeVisible();
  await night.click();
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
    await keepVillageAwake(page);

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

    await page.goto("/missions");
    await expect(page.getByTestId("braces-missions")).toBeVisible();
    await expect(page.getByTestId("braces-mission-today")).toContainText("Completata");
    await expect(page.getByTestId("braces-mission-week")).toContainText("1/7");

    page.once("dialog", (dialog) => void dialog.accept());
    await page.goto("/braces");
    await page.getByTestId("braces-remove").click();
    await expect(page.getByTestId("braces-new-smile")).toBeVisible();
    await expect(page.getByTestId("creature-new-smile").first()).toBeAttached();
    await page.goto("/missions");
    await expect(page.getByTestId("braces-missions")).toHaveCount(0);
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

  test("la sera il villaggio dorme: i giochi chiudono, la biblioteca resta aperta", async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 27, 22, 0));
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("village-energy-limit").click();
    await page.goto("/collection");
    await expect(page.getByTestId("village-sleeping")).toBeVisible();
    await page.goto("/quiz");
    await page.getByTestId("quiz-start").click();
    await expect(page.getByTestId("village-asleep")).toBeVisible();

    await page.goto("/library");
    await page.getByTestId("library-open-water").click();
    for (let next = 0; next < 3; next += 1) await page.getByTestId("library-next").click();
    await page.getByTestId("library-end").click();
    await expect(page.getByText("Già letta")).toBeVisible();
  });

  test("orto, casa del topolino, piazza e laboratorio", async ({ page }) => {
    // Five screens and a brushing in one journey: about 30 s on the development server.
    test.setTimeout(60_000);
    await completeFirstRun(page);
    await keepVillageAwake(page);
    await page.getByTestId("village-energy-limit").click();

    await page.goto("/garden");
    await page.getByTestId("garden-start").click();
    for (let food = 0; food < 6; food += 1) {
      await page.getByTestId("garden-friend").click();
      await expect(page.getByTestId("garden-feedback")).toBeVisible();
      await page.getByTestId("garden-next").click();
    }
    await expect(page.getByTestId("garden-result")).toContainText("su 6");

    await page.goto("/tooth-mouse");
    await page.getByTestId("tooth-lower-left-0").click();
    await page.getByTestId("mouse-record").click();
    await expect(page.getByTestId("mouse-thanks")).toBeVisible();
    await expect(page.getByTestId("mouse-count")).toHaveText("1 dente caduto");
    await page.reload();
    await page.getByTestId("tooth-lower-left-0").click();
    await expect(page.getByTestId("mouse-lost-on")).toBeVisible();
    await page.getByTestId("mouse-undo").click();
    await expect(page.getByTestId("mouse-count")).toHaveText("0 denti caduti");

    await brushOnce(page);
    await page.goto("/square");
    await expect(page.getByTestId("square-boss-status")).toContainText("Ancora 9 colpi");

    await page.goto("/bubble-lab");
    await expect(page.getByTestId("lab-count")).toContainText("0 su 5");
    await expect(page.getByTestId("lab-brew-smile")).toBeDisabled();
  });
});
