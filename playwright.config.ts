import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout exécutés contre le serveur de développement local.
 * CHROMIUM_PATH permet d'utiliser un Chromium déjà présent sur la machine.
 */
const executablePath = process.env["CHROMIUM_PATH"] || undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8080", trace: "off" },
  projects: [
    {
      name: "iOS",
      use: { ...devices["iPhone 13"], browserName: "chromium", launchOptions: { executablePath } },
    },
    {
      name: "Android",
      use: { ...devices["Pixel 5"], launchOptions: { executablePath } },
    },
    {
      name: "Bureau",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } },
    },
  ],
});
