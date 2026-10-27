import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

/** History and toothbrush left the tab bar: they open from the Family tab (PR #10 layout). */
async function openFromFamily(page: Page, target: "family-nav-history" | "family-nav-device") {
  await page.getByTestId("tab-family").click();
  await page.getByTestId(target).click();
}

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ADDITIONAL_ROUTES = [
  { name: "collection", path: "/collection", title: "Il tuo mondo" },
  { name: "explore", path: "/explore", title: "Isola Sorridente" },
  { name: "history", path: "/history", title: "Storico" },
  { name: "missions", path: "/missions", title: "Missioni" },
  { name: "rewards", path: "/rewards", title: "I tuoi premi" },
  { name: "habitat", path: "/habitat", title: "La tana" },
  { name: "parent", path: "/parent", title: "Area genitori" },
  { name: "settings", path: "/settings", title: "Impostazioni" },
  { name: "hardware-test", path: "/hardware-test", title: "Collaudo hardware" },
  { name: "quiz", path: "/quiz", title: "Quiz del sorriso" },
  { name: "tooth-names", path: "/tooth-names", title: "Nomi dei denti" },
  { name: "museum", path: "/museum", title: "Museo del sorriso" },
  { name: "dentist-visit", path: "/dentist-visit", title: "Prepara la visita dal dentista" },
  { name: "braces", path: "/braces", title: "Modalità apparecchio" },
  { name: "not-found", path: "/collegamento-inesistente", title: "Pagina non trovata" },
] as const;

async function scan(page: Page, testInfo: TestInfo, name: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await mkdir("artifacts/playwright/axe", { recursive: true });
  await writeFile(
    `artifacts/playwright/axe/${name}.json`,
    JSON.stringify(results, null, 2),
  );
  await testInfo.attach(`${name}-axe.json`, {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  const violations = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.description} (${violation.nodes.length})`,
  );
  expect.soft(violations, `Violazioni axe in ${name}`).toEqual([]);
}

async function completeFirstRun(page: Page, starter = "bloopi") {
  await page.goto("/");
  await expect(page.getByTestId("onboarding-overlay")).toBeVisible();
  for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
    await page.getByTestId("onboarding-next").click();
  }
  await expect(page.getByTestId("starter-chooser")).toBeVisible();
  await page.getByTestId(`starter-${starter}`).click();
  await page.getByTestId("starter-confirm").click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

async function scanSelectedStarters(
  page: Page,
  testInfo: TestInfo,
  prefix = "",
) {
  for (const starter of ["spriggo", "flarello"]) {
    const option = page.getByTestId(`starter-${starter}`);
    await option.click();
    await expect(option).toHaveAttribute("aria-checked", "true");
    await scan(page, testInfo, `${prefix}starter-${starter}`);
  }
}

async function waitForActiveModal(page: Page) {
  await expect(
    page.locator('[aria-modal="true"][role="dialog"]'),
  ).toBeVisible();
}

async function scanAdditionalRoutes(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
) {
  for (const route of ADDITIONAL_ROUTES) {
    await page.goto(route.path);
    await expect(
      page.getByText(route.title, { exact: true }).first(),
    ).toBeVisible();
    await scan(page, testInfo, `${prefix}${route.name}`);
  }
}

async function scanBackupComparison(
  page: Page,
  testInfo: TestInfo,
  prefix: string,
) {
  const legacyCode = `BRUSHLINGS-BACKUP-1:${JSON.stringify({
    format: "brushlings-backup",
    version: 1,
    createdAt: Date.now(),
    profile: { selectedId: "bloopi", hasChosenStarter: true },
    customization: { ownedIds: ["bubble-room"] },
    history: [],
  })}`;
  await page.getByTestId("backup-import-code").fill(legacyCode);
  await page.getByTestId("backup-inspect-code").click();
  await expect(page.getByTestId("backup-comparison-legacy")).toBeVisible();
  await page.getByTestId("backup-restore-legacy").click();
  await expect(page.getByTestId("backup-confirm-legacy-card")).toBeVisible();
  await scan(page, testInfo, `${prefix}backup-comparison-confirm`);
}

test.describe("WCAG automatic audit", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("onboarding", async ({ page }, testInfo) => {
    await page.goto("/");
    const onboarding = page.getByTestId("onboarding-overlay");
    await expect(onboarding).toBeVisible();
    await expect(onboarding).toHaveAttribute("role", "dialog");
    await waitForActiveModal(page);
    await scan(page, testInfo, "onboarding");

    for (let pageIndex = 0; pageIndex < 4; pageIndex += 1) {
      await page.getByTestId("onboarding-next").click();
    }
    const starter = page.getByTestId("starter-bloopi");
    await expect(starter).toHaveAttribute("role", "radio");
    await expect(starter).toHaveAttribute("aria-checked", "true");
    await scan(page, testInfo, "starter");
    await scanSelectedStarters(page, testInfo);
  });

  test("tutte le schermate principali dopo il primo avvio", async ({
    page,
  }, testInfo) => {
    await completeFirstRun(page);
    await scan(page, testInfo, "today");

    // The timer and the mouth zones appear on the session screen (PR #10 layout).
    await page.getByTestId("manual-start-stop").click();
    const timer = page.getByTestId("manual-timer");
    await expect(timer).toHaveAttribute("aria-valuemin", "0");
    await expect(timer).toHaveAttribute("aria-valuemax", "120");
    await expect(timer).toHaveAttribute("aria-valuetext", /^Timer di spazzolamento: 0:0\d di 2:00$/);
    const zones = page.getByTestId("mouth-zones-progress");
    await expect(zones).toHaveAttribute("aria-valuemin", "0");
    await expect(zones).toHaveAttribute("aria-valuenow", "0");
    await expect(zones).toHaveAttribute("aria-valuemax", "4");
    await scan(page, testInfo, "session");
    // Stopped before five seconds: nothing is saved and Today comes back.
    await page.getByTestId("manual-start-stop").click();
    await expect(page.getByTestId("today-screen")).toBeVisible();

    await openFromFamily(page, "family-nav-device");
    await expect(page.getByTestId("device-screen")).toBeVisible();
    await scan(page, testInfo, "device");

    await page.goto("/backup");
    await expect(page.getByTestId("backup-screen")).toBeVisible();
    await scan(page, testInfo, "backup");
    await scanBackupComparison(page, testInfo, "");

    await scanAdditionalRoutes(page, testInfo, "");
  });

  test("village activities in play", async ({ page }, testInfo) => {
    await completeFirstRun(page);
    await page.goto("/settings");
    await page.getByTestId("village-energy-limit").click();

    await page.goto("/quiz");
    await page.getByTestId("quiz-start").click();
    await page.getByTestId("quiz-answer-1").click();
    await expect(page.getByTestId("quiz-feedback")).toBeVisible();
    await scan(page, testInfo, "quiz-feedback");

    await page.goto("/tooth-names");
    await page.getByTestId("tooth-upper-left-2").click();
    await expect(page.getByTestId("tooth-name-local")).toBeVisible();
    await scan(page, testInfo, "tooth-names-explore");
    await page.getByTestId("tooth-mode-memory").click();
    await page.getByTestId("tooth-memory-start").click();
    await page.getByTestId("memory-card-0").click();
    await scan(page, testInfo, "tooth-names-memory");

    await page.goto("/braces");
    await page.getByTestId("braces-enable").click();
    await page.getByTestId("braces-start-care").click();
    await expect(page.getByTestId("braces-step-timer")).toBeVisible();
    await scan(page, testInfo, "braces-care");
  });
});

// The six themes (PR #10) set their own light or dark palette, whatever the system scheme.
const APP_THEME_IDS = ["adventure", "arcade", "cosmos", "garden", "bubbles", "underwater"] as const;

test.describe("WCAG automatic audit of the six themes", () => {
  test.use({ colorScheme: "dark" });

  for (const themeId of APP_THEME_IDS) {
    test(`Oggi, sessione e schede principali con il tema ${themeId}`, async ({ page }, testInfo) => {
      await completeFirstRun(page);
      await page.goto("/settings");
      await page.getByTestId(`theme-${themeId}`).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", themeId);
      await scan(page, testInfo, `${themeId}-settings`);

      await page.getByTestId("tab-today").click();
      await expect(page.getByTestId("today-screen")).toBeVisible();
      await scan(page, testInfo, `${themeId}-today`);
      // For scripts/theme-comparison.cjs, next to the approved boards.
      await page.screenshot({ path: `artifacts/playwright/themes/home-${themeId}.png` });

      await page.getByTestId("manual-start-stop").click();
      await expect(page.getByTestId("manual-timer")).toBeVisible();
      await scan(page, testInfo, `${themeId}-session`);
      await page.screenshot({ path: `artifacts/playwright/themes/session-${themeId}.png` });
      await page.getByTestId("manual-start-stop").click();
      await expect(page.getByTestId("today-screen")).toBeVisible();

      for (const tab of ["tab-world", "tab-rewards", "tab-family"] as const) {
        await page.getByTestId(tab).click();
        await page.waitForTimeout(300);
        await scan(page, testInfo, `${themeId}-${tab}`);
      }
      await page.getByTestId("family-nav-device").click();
      await expect(page.getByTestId("device-screen")).toBeVisible();
      await scan(page, testInfo, `${themeId}-device`);
    });
  }
});

test.describe("WCAG automatic audit of reward states", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`completed Flarello reward in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await page.clock.install();
      await completeFirstRun(page, "flarello");
      await page.getByTestId("manual-start-stop").click();
      await page.clock.fastForward(120_000);
      await expect(page.getByTestId("session-reward-modal")).toBeVisible();
      await waitForActiveModal(page);
      await scan(page, testInfo, `${colorScheme}-reward-flarello`);
    });
  }
});

test.describe("WCAG automatic audit in demo mode", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`simulated week on today, history and parent area in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ colorScheme });
      await completeFirstRun(page);
      await openFromFamily(page, "family-nav-device");
      await expect(page.getByTestId("device-screen")).toBeVisible();
      const demoSwitch = page.getByTestId("device-demo-switch");
      await demoSwitch.click();
      await expect(demoSwitch).toHaveAttribute("aria-checked", "true");
      await page.getByRole("button", { name: "Genera una settimana di dati demo" }).click();
      await expect(page.getByText(/^14 sessioni simulate/)).toBeVisible();

      for (const route of [
        { name: "today", path: "/" },
        { name: "history", path: "/history" },
        { name: "parent", path: "/parent" },
      ]) {
        await page.goto(route.path);
        await expect(page.getByTestId("demo-mode-notice")).toBeVisible();
        if (route.name === "history") {
          await expect(page.getByText("Sessione demo").first()).toBeVisible();
        }
        await scan(page, testInfo, `${colorScheme}-demo-${route.name}`);
      }
    });
  }
});

test.describe("WCAG automatic audit of the parent gate", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(colorScheme, () => {
      test.use({ colorScheme });

      test(`challenge before the parent area in ${colorScheme}`, async ({ page }, testInfo) => {
        await completeFirstRun(page);
        await page.goto("/settings");
        await page.getByRole("switch", { name: "Blocco genitori" }).click();
        await page.goto("/parent");
        await expect(page.getByTestId("parent-gate-card")).toBeVisible();
        await page.getByTestId("parent-gate-input").fill("1");
        await page.getByTestId("parent-gate-confirm").click();
        await expect(page.getByTestId("parent-gate-wrong")).toBeVisible();
        await scan(page, testInfo, `${colorScheme}-parent-gate`);
      });
    });
  }
});
