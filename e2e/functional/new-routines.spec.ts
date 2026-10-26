import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

async function firstRun(page: Page) {
  await page.goto("/");
  for (let index = 0; index < 4; index++) await page.getByTestId("onboarding-next").click();
  await page.getByTestId("starter-bloopi").click();
  await page.getByTestId("starter-confirm").click();
  await expect(page.getByTestId("today-screen")).toBeVisible();
}

test("care settings survive reload and a failed write preserves the saved name", async ({ page }) => {
  test.setTimeout(90_000);
  await firstRun(page);
  await page.goto("/settings");
  await page.getByTestId("care-brushling-name").fill("Luna");
  await page.getByRole("radio", { name: "60 secondi", exact: true }).click();
  await page.getByRole("switch", { name: /^Modalità tranquilla/ }).click();
  await page.getByTestId("care-save").click();
  await expect(page.getByText("Routine salvata per questo bambino.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("care-brushling-name")).toHaveValue("Luna");
  await expect(page.getByRole("radio", { name: "60 secondi", exact: true })).toBeChecked();
  await page.getByTestId("care-brushling-name").fill("Non salvato");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes("preferences")) throw new Error("Simulated full disk");
      return original.call(this, key, value);
    };
  });
  await page.getByTestId("care-save").click();
  await expect(page.getByText("Salvataggio non riuscito. Riprova.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("care-brushling-name")).toHaveValue("Luna");
});

test("a parent records one brushing session and exports the full 30-day calendar", async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date("2026-10-26T09:00:00"));
  await firstRun(page);
  await page.goto("/parent");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Registra stamattina", exact: true }).click();
  await expect(page.getByText("Sessione registrata.", { exact: true })).toBeVisible();
  await expect(page.getByText("1 sessioni complete · durata media 120s", { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Esporta CSV", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("sparkly-brush-dentist-30d.csv");
  const path = await download.path();
  expect(path).toBeTruthy();
  const csv = await readFile(path!, "utf8");
  expect(csv.split("\r\n").filter((row) => /^"2026-/.test(row))).toHaveLength(30);
  expect(csv).toContain('"2026-10-26","Sì","No","1"');
  await page.reload();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Registra stamattina", exact: true }).click();
  await expect(page.getByText("Sessione registrata.", { exact: true })).toBeVisible();
  await page.goto("/history");
  await expect(page.getByTestId("history-session-0")).toBeVisible();
  await expect(page.getByTestId("history-session-1")).toHaveCount(0);
});
