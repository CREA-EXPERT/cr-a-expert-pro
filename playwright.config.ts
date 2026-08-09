import { defineConfig, devices } from "@playwright/test";

/** Tests de bout en bout exécutés contre le serveur de développement local. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:8080", trace: "off" },
  projects: [
    { name: "iOS", use: { ...devices["iPhone 13"] } },
    { name: "Android", use: { ...devices["Pixel 5"] } },
    { name: "Bureau", use: { ...devices["Desktop Chrome"] } },
  ],
});
