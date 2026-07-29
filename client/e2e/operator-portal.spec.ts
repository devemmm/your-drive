import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Provider (bus operator) portal E2E.
 *
 * Exercises the operator dashboard features added on the recurring-schedules
 * branch:
 *   - login as a seeded BUS_OPERATOR (2-step login form -> auto-redirect to
 *     /operator)
 *   - My Buses: the operator's seeded bus is listed
 *   - My Routes: the seeded route is listed; create a new route
 *   - Schedules: the recurring-schedule manager lists the seeded 08:00
 *     departure for the route and can add a new departure time
 *   - Trips: one-time (single-departure) trips are created here and appear in
 *     the upcoming-trips table
 *
 * The backend test seed (server/src/services/testSeed.service.ts) creates the
 * operator "Olivia Operator", a Kigali -> Huye route, a Yutong bus, and an
 * active 08:00 departure. We reset it via the test endpoint before the run.
 */

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3003";
const TEST_TOKEN = process.env.E2E_TEST_TOKEN ?? "qat-bus-token-local-2026";

const OPERATOR_EMAIL = "e2e+operator.olivia@yourdrive.test";

let seededPassword = "E2eTest!2026";

async function resetBackend(request: APIRequestContext) {
  const res = await request.post(`${API_URL}/api/v1/test/reset`, {
    headers: { "x-test-token": TEST_TOKEN, "Content-Type": "application/json" },
    data: {},
  });
  expect(res.ok(), `test/reset failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  expect(body?.data?.operator?.email).toBe(OPERATOR_EMAIL);
  seededPassword = body.data.password;
}

// Drives the 2-step login form and waits for the BUS_OPERATOR auto-redirect.
async function loginAsOperator(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email Address").fill(OPERATOR_EMAIL);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Password", { exact: true }).fill(seededPassword);
  await page.getByRole("button", { name: "Sign In" }).click();
  // login() does window.location.replace("/operator") for BUS_OPERATOR.
  await page.waitForURL("**/operator", { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Operator Dashboard" })).toBeVisible();
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  await resetBackend(request);
  await request.dispose();
});

// The stack runs alongside Metro/Docker/simulator on the dev box, so UI can be
// slow to settle; give each test generous headroom.
test.setTimeout(90_000);

test("operator can log in and see their seeded bus", async ({ page }) => {
  await loginAsOperator(page);
  await page.getByRole("button", { name: "My Buses" }).click();
  // Seeded operator bus.
  await expect(page.getByRole("cell", { name: /Yutong ZK6122/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: "RAD 100 OPS" })).toBeVisible();
});

test("operator sees the seeded route and can create a new one", async ({ page }) => {
  await loginAsOperator(page);
  await page.getByRole("button", { name: "My Routes" }).click();

  // Seeded route.
  await expect(page.getByRole("cell", { name: "Kigali → Huye" })).toBeVisible();

  // Create a new route and confirm it lands in the table.
  await page.getByLabel("Origin city").fill("Kigali");
  await page.getByLabel("Destination city").fill("Musanze");
  await page.getByLabel("Distance (km)").fill("106");
  await page.getByLabel("Base fare (RWF)").fill("3500");
  await page.getByRole("button", { name: "Add route" }).click();

  await expect(page.getByRole("cell", { name: "Kigali → Musanze" })).toBeVisible({ timeout: 15_000 });
});

test("the Dashboard nav link takes an operator to /operator", async ({ page }) => {
  await loginAsOperator(page);
  // Open the account dropdown and click Dashboard.
  await page.getByTestId("account-menu-trigger").click();
  await page.getByRole("menuitem", { name: /dashboard/i }).click();
  await page.waitForURL("**/operator", { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Operator Dashboard" })).toBeVisible();
});

test("operator can open a route and add a stopover point", async ({ page }) => {
  await loginAsOperator(page);
  await page.getByRole("button", { name: "My Routes" }).click();

  // Click the seeded route row to open the editor dialog.
  await page.getByRole("cell", { name: "Kigali → Huye" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Edit route" })).toBeVisible();

  // Add a stopover point and save.
  await dialog.getByRole("button", { name: "+ Add stop" }).click();
  await dialog.getByPlaceholder(/Stop name/).fill("Nyanza Town");
  await dialog.getByPlaceholder(/^City/).fill("Nyanza");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  // Dialog closes on success.
  await expect(page.getByRole("dialog")).toHaveCount(0, { timeout: 15_000 });

  // Reopen and confirm the stop persisted (round-trip through the backend).
  await page.getByRole("cell", { name: "Kigali → Huye" }).click();
  const reopened = page.getByRole("dialog");
  await expect(reopened.getByRole("heading", { name: "Edit route" })).toBeVisible();
  await expect(reopened.getByPlaceholder(/Stop name/)).toHaveValue("Nyanza Town", { timeout: 15_000 });
});

test("operator manages the recurring schedule on the Schedules tab", async ({ page }) => {
  await loginAsOperator(page);
  await page.getByRole("button", { name: "Schedules", exact: true }).click();
  await expect(page.getByText("Recurring schedules")).toBeVisible();

  // Recurring schedule manager: pick the seeded route via its labeled field.
  // (Selects use getByRole("combobox") — getByLabel text-matches the wrapping
  // label's textContent, which for a <select> includes all its option text.)
  await page.getByRole("combobox", { name: "Route" }).selectOption({ label: "Kigali → Huye" });

  // Seeded 08:00 departure on the Yutong bus is listed.
  await expect(page.getByRole("cell", { name: "08:00" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("cell", { name: /Yutong ZK6122/ })).toBeVisible();

  // Add a second departure time on the same bus.
  await page.getByLabel("Departure time").fill("14:30");
  await page.getByRole("combobox", { name: "Bus" }).selectOption({ label: "Yutong ZK6122 (RAD 100 OPS)" });
  await page.getByRole("button", { name: "Add time" }).click();

  await expect(page.getByRole("cell", { name: "14:30" })).toBeVisible({ timeout: 15_000 });
});

test("operator schedules a one-time trip on the Trips tab", async ({ page }) => {
  await loginAsOperator(page);
  await page.getByRole("button", { name: "Trips", exact: true }).click();

  // Its own intro + one-off form; the recurring manager lives on Schedules.
  await expect(page.getByText("One-time trips")).toBeVisible();
  await expect(page.getByText("Recurring schedules")).toHaveCount(0);

  // Create a single extra departure a week out, via the labeled fields.
  const departure = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = `${departure.getFullYear()}-${pad(departure.getMonth() + 1)}-${pad(
    departure.getDate()
  )}T09:30`;

  await page.getByRole("combobox", { name: "Route" }).selectOption({ label: "Kigali → Huye" });
  await page.getByRole("combobox", { name: "Bus" }).selectOption({ label: "Yutong ZK6122 (RAD 100 OPS)" });
  await page.getByLabel("Departure date & time").fill(local);
  await page.getByLabel("Available seats").fill("35");
  await page.getByRole("button", { name: "Schedule one-time trip" }).click();

  // The new departure appears in the upcoming-trips table (seats none booked).
  await expect(page.getByRole("cell", { name: "35/35" })).toBeVisible({ timeout: 15_000 });
});
