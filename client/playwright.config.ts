import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the YourDrive web client (provider/operator portal).
 *
 * Targets the running stack:
 *   - web client served by Docker at http://localhost:8480 (baked with
 *     VITE_API_URL=http://localhost:3003)
 *   - API at http://localhost:3003 with the test endpoints enabled
 *     (NODE_ENV!=production + TEST_AUTH_TOKEN set)
 *
 * Override host/token via env when running against a different stack.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8480";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
