# RWF Localization + Tax Model Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lingering Canadian financial-locale assumptions (CAD currency defaults, GST/PST/QST/HST tax model, `ProvinceCodes` enum) with a Rwanda-first, multi-currency-tolerant posture. Drop the tax pipeline entirely for MVP.

**Architecture:** Single feature branch (`feat/rwf-localization`). Refactor code paths to stop reading/writing tax fields BEFORE dropping schema, so TypeScript compiles continuously. New helpers (`getDefaultCurrency()` server-side; `formatCurrency()` client + mobile) provide the locale-aware contract. One Prisma migration drops `Tax`, `TaxRate`, `ProvinceCodes` and flips `@default("CAD")` → `@default("RWF")`.

**Tech Stack:** Prisma + PostgreSQL (server), Vite + React (client), Expo + React Native (mobile). Server uses Jest (`npx jest`); client and mobile have no test runner installed today, so their helpers are validated by TypeScript + visual inspection rather than unit tests in this slice.

**Spec:** `docs/superpowers/specs/2026-05-04-rwf-localization-design.md`
**Branch:** `feat/rwf-localization` (already created)

---

## Task ordering rationale

1. Helpers first (Tasks 1-3) — independent, TDD'd in isolation, callable by later tasks.
2. Code refactors (Tasks 4-11) — stop reading/writing tax+province fields. Schema still has them, so TypeScript stays compilable throughout.
3. Schema migration (Task 12) — now safe to drop fields/tables/enums; no remaining references.
4. Cleanup (Tasks 13-15) — env, docs, comments, gap-analysis updates.
5. Verification (Task 16) — final tsc + tests across all three packages.

---

## Task 1: Server `getDefaultCurrency()` helper

**Files:**
- Create: `server/src/utils/currency.ts`
- Test: `server/src/utils/__tests__/currency.test.ts`

**Test runner:** Jest (already configured; server `package.json` has `"test": "jest"` and `jest@^29.7.0` in devDeps). Locate the existing jest config (`server/jest.config.*` or `"jest"` block in `package.json`) before writing the test, to confirm the test file path pattern (likely `**/__tests__/**.test.ts`).

- [ ] **Step 1: Write the failing test**

```ts
// server/src/utils/__tests__/currency.test.ts
import { getDefaultCurrency } from "../currency";

describe("getDefaultCurrency", () => {
  const originalEnv = process.env.DEFAULT_CURRENCY;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.DEFAULT_CURRENCY;
    else process.env.DEFAULT_CURRENCY = originalEnv;
  });

  it("returns RWF when DEFAULT_CURRENCY is unset", () => {
    delete process.env.DEFAULT_CURRENCY;
    expect(getDefaultCurrency()).toBe("RWF");
  });

  it("returns RWF when DEFAULT_CURRENCY is empty string", () => {
    process.env.DEFAULT_CURRENCY = "";
    expect(getDefaultCurrency()).toBe("RWF");
  });

  it("returns the env value when DEFAULT_CURRENCY is set", () => {
    process.env.DEFAULT_CURRENCY = "USD";
    expect(getDefaultCurrency()).toBe("USD");
  });

  it("trims whitespace from DEFAULT_CURRENCY", () => {
    process.env.DEFAULT_CURRENCY = "  CAD  ";
    expect(getDefaultCurrency()).toBe("CAD");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest src/utils/__tests__/currency.test.ts`
Expected: FAIL with `Cannot find module '../currency'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// server/src/utils/currency.ts
export const getDefaultCurrency = (): string =>
  process.env.DEFAULT_CURRENCY?.trim() || "RWF";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest src/utils/__tests__/currency.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```
git add server/src/utils/currency.ts server/src/utils/__tests__/currency.test.ts
git commit -m "feat(server): add getDefaultCurrency helper with RWF default"
```

---

## Task 2: Client `formatCurrency()` helper

**Files:**
- Create: `client/src/lib/currency.ts`

**No test runner installed in `client/`.** Validate via TypeScript compile + a one-shot Node sanity script. A future slice can add Vitest if desired.

- [ ] **Step 1: Write the helper**

```ts
// client/src/lib/currency.ts
const NO_SUBUNIT = new Set(["RWF", "JPY", "KRW", "VND", "UGX"]);

export const formatCurrency = (amountCents: number, currency: string = "RWF"): string => {
  const noSubunit = NO_SUBUNIT.has(currency);
  const amount = noSubunit ? Math.round(amountCents / 100) : amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: noSubunit ? 0 : 2,
    maximumFractionDigits: noSubunit ? 0 : 2,
  }).format(amount);
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Sanity-check output with a one-shot Node eval**

Run from repo root:
```
node -e "const f=(c,cur='RWF')=>{const n=new Set(['RWF','JPY','KRW','VND','UGX']).has(cur);const a=n?Math.round(c/100):c/100;return new Intl.NumberFormat('en-US',{style:'currency',currency:cur,minimumFractionDigits:n?0:2,maximumFractionDigits:n?0:2}).format(a)}; console.log(f(12500000,'RWF')); console.log(f(1250,'CAD')); console.log(f(1250,'USD')); console.log(f(12550,'RWF')); console.log(f(0,'RWF')); console.log(f(0,'CAD'));"
```
Expected output (similar — exact symbol may vary by Intl runtime):
```
RWF 125,000
CA$12.50
$12.50
RWF 126
RWF 0
CA$0.00
```
If the RWF output contains a decimal point or the CAD output is missing decimals, the implementation is wrong.

- [ ] **Step 4: Commit**

```
git add client/src/lib/currency.ts
git commit -m "feat(client): add locale-aware formatCurrency helper"
```

---

## Task 3: Mobile `formatCurrency()` extension

**Files:**
- Modify: `mobile/src/lib/utils.ts` (extend existing `formatCurrency`)

**No test runner installed in `mobile/`.** Validate via TypeScript + the same Node sanity script as Task 2.

- [ ] **Step 1: Read existing `mobile/src/lib/utils.ts`** to find the current `formatCurrency` export and its callers.

Run: `cd mobile && grep -n -A6 "formatCurrency" src/lib/utils.ts`
Note the current signature. Common shapes: `formatCurrency(amount: number)` with hardcoded behavior; or already taking a currency arg.

Also note the unit convention: does the existing helper expect cents (e.g., `walletBalanceCents`) or major units (e.g., dollars)? Examine 1-2 callers (`mobile/src/app/(drawer)/wallet.tsx` is a known caller).

- [ ] **Step 2: Replace the existing `formatCurrency` export** in `mobile/src/lib/utils.ts` with:

```ts
const NO_SUBUNIT = new Set(["RWF", "JPY", "KRW", "VND", "UGX"]);

export const formatCurrency = (amountCents: number, currency: string = "RWF"): string => {
  const noSubunit = NO_SUBUNIT.has(currency);
  const amount = noSubunit ? Math.round(amountCents / 100) : amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: noSubunit ? 0 : 2,
    maximumFractionDigits: noSubunit ? 0 : 2,
  }).format(amount);
};
```

**Unit-convention note:** if existing callers in mobile pass major units (dollars, not cents), the simplest path is to *change the call sites* in Task 11 to pass cents instead. The helper's contract here is "cents in" — matches client and server. If a caller cannot easily convert (e.g., it gets the amount as a Decimal string from a server payload), see Task 11 for accommodation.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: pre-existing error in `mobile/src/app/ride-request/[id].tsx` (`Property 'data' does not exist on type 'Ride'`) is acceptable; no new errors from this change.

- [ ] **Step 4: Sanity-check output**

Run from repo root (same script as Task 2 step 3):
```
node -e "const f=(c,cur='RWF')=>{const n=new Set(['RWF','JPY','KRW','VND','UGX']).has(cur);const a=n?Math.round(c/100):c/100;return new Intl.NumberFormat('en-US',{style:'currency',currency:cur,minimumFractionDigits:n?0:2,maximumFractionDigits:n?0:2}).format(a)}; console.log(f(12500000,'RWF')); console.log(f(1250,'CAD'));"
```

- [ ] **Step 5: Commit**

```
git add mobile/src/lib/utils.ts
git commit -m "feat(mobile): locale-aware formatCurrency with RWF default"
```

---

## Task 4: Refactor server payment-session creators to drop tax flow

**Files:**
- Modify: `server/src/controllers/d2d.controller.ts` (lines ~1138-1200, ~1652-1714)
- Modify: `server/src/controllers/ride.controller.ts` (lines ~1577-1717)
- Modify: `server/src/controllers/subscription.controller.ts` (lines ~561-604)
- Modify: `server/src/services/booking.service.ts` (lines ~49, ~418)

**Goal:** Stop calculating tax, stop reading `taxSnapshot`, stop writing `provinceCode` to `PaymentSession`. Pre-tax base amount becomes the total amount.

- [ ] **Step 1: In `server/src/controllers/d2d.controller.ts`**, locate both occurrences of the block:

```ts
const provinceCode = ...;
if (!provinceCode) { ... }
const taxSnapshot = await calculatePlatformTax(provinceCode, platformFee);
const taxAmount = taxSnapshot.taxAmount;
```

Replace with a no-tax flow. The PaymentSession.create call further down (around line 1170-1200 and 1684-1714) currently includes:
```ts
{
  amount: <baseAmount>,
  totalAmount: <baseAmount + taxAmount>,
  currency: "CAD",
  provinceCode,
  taxSnapshot,
  ...
}
```

Change to:
```ts
{
  amount: <baseAmount>,
  totalAmount: <baseAmount>,    // no tax addition
  currency: getDefaultCurrency(),
  // provinceCode dropped
  // taxSnapshot dropped
  ...
}
```

Also remove the `taxDetails: taxSnapshot?.taxDetails || []` line in any nested object.

Add the import at the top of the file:
```ts
import { getDefaultCurrency } from "../utils/currency";
```

Remove the `import { calculatePlatformTax, getProvinceCode } from "../utils/tax";` import if it exists (check the top of the file).

- [ ] **Step 2: Same refactor in `server/src/controllers/ride.controller.ts`** (lines ~1577-1717).

The ride controller has a slightly different shape — `taxSnapshot` may be wrapped in a `provinceCode ? await calculatePlatformTax(...) : null` ternary. Drop the entire ternary; treat `totalAmount = baseAmount`.

Lines ~271, ~296 set `regionCode` from `getProvinceCode(...)` for `Location.upsert`. Replace `regionCode: provinceCode ?? null` with `regionCode: null`. We're keeping `Location.regionCode` as a freeform `String?` after the schema migration; for now (pre-migration), passing `null` is type-compatible since `regionCode` is `ProvinceCodes?` (nullable).

- [ ] **Step 3: Same refactor in `server/src/controllers/subscription.controller.ts`** (lines ~561-604).

Drop the `provinceCode`, `tax`, and `taxSnapshot` block. PaymentSession creation: drop `provinceCode`, drop `taxSnapshot`, set `currency: getDefaultCurrency()`. Use `plan.price` directly as `totalAmount`.

- [ ] **Step 4: In `server/src/services/booking.service.ts`**, lines ~49 and ~418:

Currently:
```ts
const taxSnap = session.taxSnapshot as TaxSnapshot | null;
```

Delete this line entirely. Find downstream uses of `taxSnap` in the same function and remove them (e.g., adding tax components to amounts; just use the session amounts directly).

If a `currency: session.currency || "CAD"` literal exists nearby (lines 60, 429), change to `currency: session.currency || getDefaultCurrency()`. Add the import at the top:

```ts
import { getDefaultCurrency } from "../utils/currency";
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: clean (no errors). If `TaxSnapshot` type errors appear in `transaction.service.ts:1190`, that line is a type annotation in a function signature. Replace `provinceCode: string` → remove the field from the type or comment out — verify it's not in active code path. If the function is unused (search for callers), delete it.

- [ ] **Step 6: Run server tests to confirm no regressions**

Run: `cd server && npx jest`
Expected: all existing tests pass.

- [ ] **Step 7: Commit**

```
git add server/src/controllers/d2d.controller.ts server/src/controllers/ride.controller.ts server/src/controllers/subscription.controller.ts server/src/services/booking.service.ts
git commit -m "refactor(server): drop tax calculation from payment-session creators"
```

---

## Task 5: Drop `originProvinceCode`/`destProvinceCode` from RideRequest flow

**Files:**
- Modify: `server/src/controllers/rideRequest.controller.ts` (lines ~150, ~183, ~229-232, ~498-506, ~790-794, ~1403-1431, ~1512-1515)
- Modify: `server/src/services/rideRequest.service.ts` (lines ~29-31)

- [ ] **Step 1: In `server/src/controllers/rideRequest.controller.ts`**, remove every reference to `originProvinceCode` / `destProvinceCode` / `getProvinceCode`:

- Lines ~150, ~498, ~504, ~1403-1406: delete the `getProvinceCode(...)` calls and their result variables.
- Line ~183: `regionCode: originProvinceCode` → `regionCode: null`.
- Lines ~229-232: drop `originProvinceCode` and `destProvinceCode` from the `prisma.rideRequest.create` data block.
- Lines ~498-506: this is a query filter (`where.origin = { regionCode: originProvinceCode }`). Delete the entire `if (originProvinceCode)` and `if (destProvinceCode)` blocks — they are province-based filters that no longer make sense.
- Lines ~790-794: `...(rr.originProvinceCode ? { regionCode: rr.originProvinceCode } : {})` — delete these two spread blocks.
- Lines ~1412, 1431: `regionCode: originProvinceCode` → `regionCode: null`.
- Lines ~1512-1515: drop `originProvinceCode` and `destProvinceCode` from the data block.

Remove the import line at the top of the file:
```ts
import { getProvinceCode } from "../utils/tax"; // (or wherever it lives)
```

- [ ] **Step 2: In `server/src/services/rideRequest.service.ts`** (lines ~29-31):

Currently:
```ts
...(ride.departureLocation.regionCode && { originProvinceCode: ride.departureLocation.regionCode }),
...(ride.destinationLocation.regionCode && { destProvinceCode: ride.destinationLocation.regionCode }),
```

Delete both spread expressions.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```
git add server/src/controllers/rideRequest.controller.ts server/src/services/rideRequest.service.ts
git commit -m "refactor(server): drop originProvinceCode/destProvinceCode from RideRequest flow"
```

---

## Task 6: Sweep remaining hardcoded `"CAD"` literals in server controllers

**Files:**
- Modify: `server/src/controllers/chauffeur.controller.ts` (line ~608)
- Modify: `server/src/controllers/rental.controller.ts` (lines ~580, ~624)
- Modify: `server/src/controllers/transaction.controller.ts` (line ~524)
- Modify: `server/src/controllers/ride.controller.ts` (line ~1710 — if not already done in Task 4)
- Modify: `server/src/services/wallet.service.ts` (lines ~56, ~92)
- Modify: `server/src/services/transaction.service.ts` (lines ~1030, ~1097, ~1243, ~1277, ~1340)

- [ ] **Step 1: Add the import** to each file that doesn't already have it:

```ts
import { getDefaultCurrency } from "../utils/currency";
```

- [ ] **Step 2: Replace each literal**:

| Pattern | Replacement |
|---|---|
| `currency: "CAD"` | `currency: getDefaultCurrency()` |
| `currency: session.currency \|\| "CAD"` | `currency: session.currency \|\| getDefaultCurrency()` |
| `currency: session.currency ?? "CAD"` | `currency: session.currency ?? getDefaultCurrency()` |
| `currency: txn.currency \|\| "CAD"` | `currency: txn.currency \|\| getDefaultCurrency()` |
| `currency: updatedTx.currency \|\| "CAD"` | `currency: updatedTx.currency \|\| getDefaultCurrency()` |
| `currency: process.env.DEFAULT_CURRENCY ?? "CAD"` | `currency: getDefaultCurrency()` |
| `currency: (session.currency \|\| "CAD").toLowerCase()` | `currency: (session.currency \|\| getDefaultCurrency()).toLowerCase()` |
| `currency: (updatedTx.currency \|\| "CAD").toLowerCase()` | `currency: (updatedTx.currency \|\| getDefaultCurrency()).toLowerCase()` |

- [ ] **Step 3: Verify zero remaining `"CAD"` matches in active code**

Run: `cd server && git grep -n '"CAD"' src/`
Expected: results are only inside commented-out lines (lines starting with `//` or inside `/* ... */`), or zero matches at all.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```
git add server/src/controllers server/src/services
git commit -m "refactor(server): replace hardcoded CAD literals with getDefaultCurrency()"
```

---

## Task 7: Delete server tax wiring (utils, types, routes, validators)

**Files:**
- Delete: `server/src/utils/tax.ts`
- Modify: `server/src/types/payment.ts` (remove `TaxSnapshot` and `provinceCode` types)
- Modify: `server/src/routes/admin.routes.ts` (lines ~100-111: tax-rates, taxes routes)
- Modify: `server/src/controllers/admin.controller.ts` (delete `getTaxRates`, `updateTaxRate`, `getTaxRecords` handlers)
- Modify: `server/src/middlewares/validators/setting.request.validator.ts` (delete `validateUpdateTaxRate` validator)

- [ ] **Step 1: Delete `server/src/utils/tax.ts`**

Run: `rm server/src/utils/tax.ts`

- [ ] **Step 2: Edit `server/src/types/payment.ts`** — delete the `TaxSnapshot` interface and any `provinceCode: string;` fields. If the file becomes empty, delete it and remove imports elsewhere.

- [ ] **Step 3: Edit `server/src/routes/admin.routes.ts`** — delete lines ~100-111 (the three tax routes). Remove the `validateUpdateTaxRate` import if unused.

- [ ] **Step 4: Edit `server/src/controllers/admin.controller.ts`** — find and delete the handlers `getTaxRates`, `updateTaxRate`, `getTaxRecords`. Remove `import { calculatePlatformTax, ... } from "../utils/tax"` if present.

- [ ] **Step 5: Edit `server/src/middlewares/validators/setting.request.validator.ts`** — find and delete `validateUpdateTaxRate`. If the file has no other exports, leave the file structure intact (only delete the validator block).

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: clean. If errors complain about missing `TaxSnapshot` import in `transaction.service.ts`, those lines should already be in commented-out blocks — leave them alone for now (Task 9 cleans them up).

- [ ] **Step 7: Commit**

```
git add -A server/src/utils server/src/types server/src/routes server/src/controllers server/src/middlewares
git commit -m "refactor(server): delete tax utils, types, routes, validators"
```

---

## Task 8: Delete admin tax tabs and unregister from dashboard

**Files:**
- Delete: `client/src/pages/admin/tabs/TaxRatesTab.tsx`
- Delete: `client/src/pages/admin/tabs/TaxesTab.tsx`
- Delete: `client/src/hooks/useTaxRates.ts`
- Delete: `client/src/hooks/useAdminTaxes.ts`
- Modify: `client/src/pages/admin/AdminDashboard.tsx` (remove tax tab imports/registrations and provinceCode filter fields at lines ~181, ~341)

- [ ] **Step 1: Delete the four files**

Run:
```
rm client/src/pages/admin/tabs/TaxRatesTab.tsx
rm client/src/pages/admin/tabs/TaxesTab.tsx
rm client/src/hooks/useTaxRates.ts
rm client/src/hooks/useAdminTaxes.ts
```

- [ ] **Step 2: Edit `client/src/pages/admin/AdminDashboard.tsx`**:

Remove imports:
```ts
import TaxRatesTab from "./tabs/TaxRatesTab";
import TaxesTab from "./tabs/TaxesTab";
```

Remove the tabs from the tabs array (look for the `tabs = [...]` block, identifiers like `taxRates` and `taxes`).

Remove the `<TabsContent value="taxRates">` and `<TabsContent value="taxes">` blocks.

At lines ~181 and ~341: remove the `provinceCode?: string;` fields from the filter type/state interfaces; remove any `provinceCode: ...` filter assignments.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```
git add -A client/src/pages/admin client/src/hooks
git commit -m "refactor(client): delete tax tabs and admin tax hooks"
```

---

## Task 9: Replace `formatCurrencyCAD` with `formatCurrency` across client

**Files:**
- Modify: any file referencing `formatCurrencyCAD` (find via grep)
- Possibly delete: the original `formatCurrencyCAD` definition file

- [ ] **Step 1: Find every reference**

Run: `cd client && git grep -n "formatCurrencyCAD" src/`

Expected output: a list of files. Each is a place to swap.

- [ ] **Step 2: For each call site**, replace:

```ts
formatCurrencyCAD(amount)
```
with:
```ts
formatCurrency(amountInCents, currency)
```

— where `currency` is the row's `currency` field if available, or omitted (defaults to RWF) otherwise. Adjust the `amount` argument: if the original `formatCurrencyCAD` was taking a major-unit number (e.g., dollars), multiply by 100 to convert to cents. If it was already taking cents, pass through.

Verify the original signature first by reading the existing `formatCurrencyCAD` definition:

Run: `cd client && git grep -n "export.*formatCurrencyCAD"`
Read the file, note whether it expects cents or major units.

Update the import in each file:
```ts
import { formatCurrency } from "@/lib/currency";
```
(or relative path to `client/src/lib/currency.ts`).

- [ ] **Step 3: Delete the original `formatCurrencyCAD` export** — once no callers remain, remove the function definition from wherever it lived.

- [ ] **Step 4: Verify zero remaining `formatCurrencyCAD` references**

Run: `cd client && git grep -n "formatCurrencyCAD" src/`
Expected: no matches.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```
git add -A client/src
git commit -m "refactor(client): swap formatCurrencyCAD for locale-aware formatCurrency"
```

---

## Task 10: Drop `provinceCode` from CreateRideRequest and RideRequests display

**Files:**
- Modify: `client/src/components/CreateRideRequest.tsx` (lines ~166, ~172)
- Modify: `client/src/components/RideRequests.tsx` (lines ~1400, ~1417)

**Note:** `CanadianCitySelector.tsx` is NOT deleted in this slice — it continues to function as a city picker. Only its `provinceCode` output is no longer consumed. Replacing it with a Rwanda-equivalent picker is a separate UI slice.

- [ ] **Step 1: In `client/src/components/CreateRideRequest.tsx`** (lines ~166, ~172):

Currently:
```ts
{
  ...
  provinceCode: initialRequest.origin?.regionCode,
  ...
}
```
Delete the `provinceCode:` line in both the origin and destination payload objects.

- [ ] **Step 2: In `client/src/components/RideRequests.tsx`** (lines ~1400, ~1417):

Currently:
```tsx
{request.data.originProvinceCode}
...
{request.data.destProvinceCode}
```
Delete these two lines (and the wrapping JSX node if it becomes empty / orphan, e.g. an empty `<span>` or comma-prefix).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd client && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```
git add client/src/components/CreateRideRequest.tsx client/src/components/RideRequests.tsx
git commit -m "refactor(client): drop provinceCode from ride-request payload and display"
```

---

## Task 11: Mobile call-site sweep for currency arg

**Files:**
- Find every caller of `formatCurrency` in `mobile/src/` and ensure the currency arg is threaded where available.

- [ ] **Step 1: Find every reference**

Run: `cd mobile && git grep -n "formatCurrency(" src/`

- [ ] **Step 2: For each call site**, check whether the data being formatted has a `currency` field in scope:

- Wallet ledger entries: have `currency` field on the transaction → pass it.
- Ride contributions: have `currency` field on the ride → pass it.
- Bare numbers without currency context: pass nothing (default RWF is correct).

Update each call:
```ts
formatCurrency(amountCents)
```
becomes:
```ts
formatCurrency(amountCents, currency)
```
when currency is available.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit`
Expected: clean (one pre-existing error in `mobile/src/app/ride-request/[id].tsx` about `Property 'data' does not exist on type 'Ride'` is acceptable — it pre-dates this slice).

- [ ] **Step 4: Commit**

```
git add mobile/src
git commit -m "refactor(mobile): thread currency through formatCurrency call sites"
```

---

## Task 12: Prisma schema migration — drop tax model, widen regionCode, flip currency defaults

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/<timestamp>_rwf_localization_drop_tax/migration.sql` (auto-generated)

- [ ] **Step 1: Edit `server/prisma/schema.prisma`** with these changes:

1. **Delete `model Tax { ... }`** entirely (currently around line 1089).
2. **Delete `model TaxRate { ... }`** entirely (around line 1077).
3. **Delete `enum ProvinceCodes { ... }`** entirely (around line 1108).
4. **In `model Transaction`**: delete the line `tax Tax?` (around line 760).
5. **In `model Location`** (around line 894): change `regionCode ProvinceCodes?` → `regionCode String?`. Update the line-comment if any references provinces.
6. **In `model PaymentSession`** (around lines 1140-1144):
   - Update line 1140 comment: `// base charge (before tax)` → `// base charge`
   - Update line 1141 comment: `// total charge including tax` → `// total charge`
   - Line 1142: change `@default("CAD")` → `@default("RWF")`
   - Line 1143: delete `provinceCode ProvinceCodes?`
   - Line 1144: delete `taxSnapshot Json?`
7. **In `model Transaction`** (around line 745): change `@default("CAD")` → `@default("RWF")`. Update line-comment to remove "e.g., CAD, USD, EUR" or keep it (informational).
8. **In `model RideRequest`** (around lines 1256, 1259): delete `originProvinceCode ProvinceCodes?` and `destProvinceCode ProvinceCodes?`.

- [ ] **Step 2: Generate the migration**

Run: `cd server && npx prisma migrate dev --name rwf_localization_drop_tax`
Expected: prisma generates a migration file under `server/prisma/migrations/<timestamp>_rwf_localization_drop_tax/`. The SQL should include `DROP TABLE`, `DROP TYPE`, `ALTER TABLE ... ALTER COLUMN`, and `ALTER COLUMN ... SET DEFAULT 'RWF'` statements.

If migrations table is in an inconsistent state from previous Slice 1 work (per status tracker discovery #3), reset the dev DB first:
```
cd server && npx prisma migrate reset --skip-seed --force
```
Then re-run `prisma migrate dev`.

- [ ] **Step 3: Inspect the generated migration SQL** to confirm it does what we expect:

Run: `ls server/prisma/migrations/*rwf_localization*/`
Read the `migration.sql` file. Verify:
- `DROP TABLE "Tax"` and `DROP TABLE "TaxRate"`
- `DROP TYPE "ProvinceCodes"`
- `ALTER TABLE "Location" ALTER COLUMN "regionCode" TYPE TEXT USING "regionCode"::TEXT` (or similar — Postgres will need a USING clause for enum→text)
- `ALTER COLUMN "currency" SET DEFAULT 'RWF'` on `Transaction` and `PaymentSession`
- `DROP COLUMN "provinceCode"`, `DROP COLUMN "taxSnapshot"` on `PaymentSession`
- `DROP COLUMN "originProvinceCode"`, `DROP COLUMN "destProvinceCode"` on `RideRequest`
- `DROP COLUMN "tax_id"` or absence of any FK from Transaction to Tax

If the USING clause is missing on the regionCode change and migrate fails, edit the SQL manually to add `USING "regionCode"::text`.

- [ ] **Step 4: Re-run migrate to confirm it applies cleanly**

Run: `cd server && npx prisma migrate dev`
Expected: "Already in sync" or successful re-application. No errors.

- [ ] **Step 5: Regenerate the Prisma client**

Run: `cd server && npx prisma generate`
Expected: client regenerated without errors.

- [ ] **Step 6: Verify server TypeScript compiles after the schema change**

Run: `cd server && npx tsc --noEmit`
Expected: clean. If any TypeScript errors complain about removed Prisma fields (e.g., `Tax`, `taxSnapshot`, `provinceCode`), trace them to a missed call site from earlier tasks and fix.

- [ ] **Step 7: Run server tests**

Run: `cd server && npx jest`
Expected: green.

- [ ] **Step 8: Commit**

```
git add server/prisma/schema.prisma server/prisma/migrations
git commit -m "feat(db): drop tax model, widen regionCode, default currency RWF"
```

---

## Task 13: Clean up Swagger docs and commented-out CAD/tax legacy

**Files:**
- Modify: `server/src/docs/schemas/setting.schema.ts` (lines ~58, ~155: remove `provinceCode` examples)
- Modify: `server/src/docs/schemas/transaction.schema.ts` (any `currency: CAD` examples)
- Modify: `server/src/docs/routes/d2d.docs.ts` (lines ~537, ~1208: change `example: "CAD"` → `"RWF"`)
- Modify: `server/src/docs/routes/ride.docs.ts` (line ~710: same)
- Modify: `server/src/docs/routes/subscription.docs.ts` (line ~543: remove `provinceCode` example)
- Modify: `server/src/docs/routes/rideRequests.docs.ts` (lines ~671, ~680: remove `originProvinceCode`/`destProvinceCode` examples)
- Modify: `server/src/docs/routes/setting.docs.ts` (remove tax docs)
- Modify: `server/src/services/transaction.service.ts` — delete the entire commented-out block (lines ~145-971 contain a giant commented-out region; verify and delete)
- Modify: `server/src/controllers/transaction.controller.ts` — delete commented-out block at lines ~160-204
- Modify: `server/src/translations/en.ts` and `fr.ts` — delete tax-related translation keys
- Modify: `server/.env.example` — add `DEFAULT_CURRENCY=RWF`
- Modify: `docker-compose.yml` (or `docker-compose.dev.yml`) — set `DEFAULT_CURRENCY=RWF` in the server service env block

- [ ] **Step 1: Sweep Swagger docs**

For each file listed above, change `"CAD"` examples → `"RWF"`, and delete `provinceCode`/`originProvinceCode`/`destProvinceCode` example properties.

- [ ] **Step 2: Delete commented-out legacy in `server/src/services/transaction.service.ts`**

Lines ~145-971 contain a large commented-out region with tax/CAD references. Identify start and end markers, delete the whole region. Take care to keep any active code or function signatures that may sit between commented blocks.

Run: `cd server && grep -n "^//" src/services/transaction.service.ts | head -50`
to identify the comment boundaries.

- [ ] **Step 3: Delete commented-out legacy in `server/src/controllers/transaction.controller.ts`** (~lines 160-204).

- [ ] **Step 4: Sweep translations**

Run: `cd server && git grep -n "tax" src/translations/`
For each match in `en.ts` and `fr.ts`, decide whether the key is tax-related. Delete tax-only keys; leave keys where "tax" is a substring of an unrelated word.

- [ ] **Step 5: Update env defaults**

In `server/.env.example`, add the line:
```
DEFAULT_CURRENCY=RWF
```

In `docker-compose.yml` (or whichever compose file the project uses), add to the server service `environment:` block:
```yaml
- DEFAULT_CURRENCY=RWF
```

- [ ] **Step 6: Verify server TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```
git add server/src/docs server/src/services/transaction.service.ts server/src/controllers/transaction.controller.ts server/src/translations server/.env.example docker-compose.yml
git commit -m "chore(server): clean up tax/CAD legacy comments, swagger docs, env defaults"
```

---

## Task 14: Update gap analysis and implementation status tracker

**Files:**
- Modify: `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md`
- Modify: `docs/superpowers/tracking/implementation-status.md`

- [ ] **Step 1: Update `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md`**:

In §2 cross-cutting:
- Currency: change Status `Partial` → `Built (RWF default, locale-aware)`
- Tax model: change Status `Partial` → `Cut (decisions log §6 #18)`
- Country / region defaults: change Status `Partial` → `Built (regionCode is freeform String)`

In §6 decisions log, add a new row:
```
| 18 | Rwanda VAT or any tax model | **Cut** (2026-05-04) — Slice 2 dropped Tax, TaxRate, ProvinceCodes entirely | Rwanda public passenger transport is VAT-exempt; rentals/chauffeur are taxable but client did not request it for MVP. Re-add as a discrete feature when accounting requires it. |
```

In §3.1 row 2.3 (`tel:` dialer button, masked calling): change Status from `Cut/Replaced` to **also flag**: "tel: dialer is now Built — `mobile/src/app/ride-request/[id].tsx:163-172`".

In §3.1 row 2.5 (coupon entry): clarify "**Web has it** (`client/src/components/CouponSelector.tsx`); mobile coupon-code entry UI still missing."

In §3.7 admin dashboard: remove `Tax rates / taxes` row (no longer exists).

- [ ] **Step 2: Update `docs/superpowers/tracking/implementation-status.md`**:

In the slice index table:
- Slice 2: rename to "RWF localization + tax model removal"; status `In progress`; spec link → `../specs/2026-05-04-rwf-localization-design.md`; plan link → `../plans/2026-05-04-rwf-localization.md`.

Add an "In-flight slice detail" block for Slice 2 mirroring the structure of the Slice 1 block. Include: status, spec, plan, branch (`feat/rwf-localization`), bundles-these-items list, and explicitly-deferred list.

Update the "Last updated" date at the top of the file to 2026-05-04.

- [ ] **Step 3: Commit**

```
git add docs/superpowers/specs/2026-04-16-feature-gap-analysis.md docs/superpowers/tracking/implementation-status.md
git commit -m "docs(planning): mark slice 2 in progress; correct slice 1 verifications"
```

---

## Task 15: Final verification

- [ ] **Step 1: Verify zero remaining `"CAD"` / `formatCurrencyCAD` references**

Run from repo root:
```
git grep -n '"CAD"' -- 'server/src/*' 'client/src/*' 'mobile/src/*'
git grep -n "formatCurrencyCAD" -- 'client/src/*' 'mobile/src/*'
git grep -n "ProvinceCodes" -- 'server/*' 'client/*' 'mobile/*'
git grep -n "provinceCode\|taxSnapshot\|originProvinceCode\|destProvinceCode" -- 'server/src/*' 'client/src/*' 'mobile/src/*'
```
Expected: zero matches across all four greps. Any remaining matches in non-deleted code paths must be addressed.

- [ ] **Step 2: TypeScript clean across all three packages**

```
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
cd mobile && npx tsc --noEmit
```
Expected: clean for server and client. Mobile may have one pre-existing error in `mobile/src/app/ride-request/[id].tsx` about `Property 'data' does not exist on type 'Ride'` — acceptable; not introduced by this slice.

- [ ] **Step 3: Tests green**

```
cd server && npx jest
```
Expected: green. Client and mobile have no test runner installed today, so no test command to run there.

- [ ] **Step 4: Manual smoke (optional but recommended)**

1. Start server with `DEFAULT_CURRENCY=RWF` env var set.
2. Open admin in browser → confirm Tax Rates / Taxes tabs are gone; other tabs render.
3. Open mobile app → wallet screen → confirm balance displays as `RWF X,XXX` (no decimals).
4. Create a test ride → confirm receipt shows RWF, no tax line, no province field.

- [ ] **Step 5: Push branch**

```
git push -u origin feat/rwf-localization
```

---

## Self-review checklist (already performed during plan authoring)

- ✅ Spec coverage: every section of the design spec maps to at least one task (helpers → Tasks 1-3; schema → Task 12; server refactor → Tasks 4-7; client → Tasks 8-10; mobile → Task 11; docs → Task 14; verification → Task 15).
- ✅ No placeholders: all code blocks contain actual code; all commands are runnable; all expected outputs are stated.
- ✅ Type consistency: `getDefaultCurrency()` signature is consistent across all server tasks; `formatCurrency(amountCents, currency = "RWF")` is consistent between client and mobile.
- ✅ Task ordering: code refactors precede schema migration so TypeScript stays compilable; Task 12 (migration) gates the cleanup tasks that depend on the new schema.

---

## Out-of-scope explicit reminders

- Replacing `CanadianCitySelector` with a Rwanda-equivalent picker: separate UI slice.
- `Float` → `Decimal` precision migration on `Transaction.amount` and similar columns: separate cross-cutting slice.
- Re-introducing any tax model: future feature, opened by accounting need.
- Mobile coupon-code entry UI: tracked as small follow-up (see gap analysis row 2.5).
- Mobile ETA-to-pickup display: tracked separately (gap analysis row 1.3).
