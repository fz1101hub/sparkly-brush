import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/functional",
  outputDir: "artifacts/playwright-functional/test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    [
      "html",
      { outputFolder: "artifacts/playwright-functional/report", open: "never" },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:8087",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    colorScheme: "light",
    ...devices["Desktop Chrome"],
    viewport: { width: 390, height: 844 },
  },
  webServer: {
    command:
      "EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_E2E=1 pnpm exec expo start --web --port 8087",
    url: "http://127.0.0.1:8087",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
