# RWF Localization + Tax Model Removal — Design

**Date:** 2026-05-04
**Slice:** 2 of N in the feature-gap implementation rollout
**Tracker:** `docs/superpowers/tracking/implementation-status.md`
**Source specs:**
- `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md` (§2 cross-cutting "Currency", "Tax model", "Country / region defaults"; §3.7 admin tabs)
- `docs/superpowers/specs/2026-04-16-consolidated-requirements.md`

---

## 1. Summary

Replace the lingering Canadian financial-locale assumptions (CAD currency defaults, GST/PST/QST/HST tax model, `ProvinceCodes` enum) with a Rwanda-first, multi-currency-tolerant posture. Drop the tax calculation pipeline entirely for MVP — there is no tax line on receipts, no tax tables in the DB, and no admin tax tabs. Currency stays as a per-row column defaulting to `RWF`, and money formatting becomes locale-aware so RWF displays without a subunit while CAD/USD continue to display with two decimals.

This is purely a localization slice. It does not introduce new product features, does not touch payment-gateway plumbing (Slice 4), and does not change money precision (`Float` → `Decimal` is its own cross-cutting slice).

## 2. Scope

**In scope:**
- Schema: drop `Tax`, `TaxRate`, `ProvinceCodes`; widen `Location.regionCode` to `String?`; flip `@default("CAD")` to `@default("RWF")` everywhere.
- Server: sweep hardcoded `"CAD"` literals in active controllers; route currency selection through a single helper; delete `utils/tax.ts`, tax routes, and any tax wiring; delete commented-out CAD legacy in `transaction.service.ts` while we are in there; ship `DEFAULT_CURRENCY=RWF` in env defaults and docker.
- Admin (web client): delete `TaxRatesTab` and `TaxesTab`, unregister from the dashboard; replace `formatCurrencyCAD` with a locale-aware `formatCurrency`.
- Mobile: extend the existing `formatCurrency` helper with a currency arg; sweep call sites.

**Out of scope (deferred / separate slices):**
- Re-introducing any tax model later (Rwanda VAT, regional VAT matrix). Treat as a future slice keyed off real client/accounting need.
- Full payment-gateway abstraction + MANUAL gateway (Slice 4).
- `Float` → `Decimal` precision migration (cross-cutting; separate slice).
- Multi-currency FX reporting in admin.
- Per-region currency rules (e.g., Rwanda locations always RWF). Currency stays free-form per row; admin-imposed rules can come later if needed.
- Re-styling existing receipt PDFs / SMS templates beyond the locale-aware currency string. Layout work is its own ticket.

## 3. Decisions log (recorded for future reference)

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Currency posture | **Multi-currency-tolerant, RWF default** | Keeps the door open for regional expansion (the project is operated by Paynow, regional). The `currency` column already exists; cost of keeping the abstraction is near-zero. |
| 2 | Tax model | **Drop entirely for MVP** | Rwanda's standard VAT does not apply to public passenger transport; rentals and chauffeur are taxable but the client has not asked for it in MVP. Re-add later as a discrete feature when accounting requires it. |
| 3 | `Location.regionCode` typing | **Freeform `String?`** | Matches multi-currency-tolerant posture; avoids a schema migration when the next market lands. Validation, if needed, lives in the UI. |
| 4 | Money storage | **Cents (unchanged), locale-aware display** | Backend cents storage works for any currency. RWF displays as whole francs (`RWF 12,500`); CAD/USD continue to display with two decimals. No data migration. |
| 5 | Existing data | **Pre-launch — destructive migration OK** | Tables can be dropped outright; no historical Tax rows to preserve. |

## 4. Schema deltas

**Drops:**
- `model Tax` — entire model removed. Any back-reference field on `Transaction` (e.g. `tax Tax?`) is removed at the same time; verify exact field name during implementation.
- `model TaxRate` — entire model removed.
- `enum ProvinceCodes` — removed.

**Type changes:**
- `Location.regionCode`: `ProvinceCodes?` → `String?`.

**Default changes:**
- Every `@default("CAD")` becomes `@default("RWF")`. Known callsites: `Transaction.currency`, `PaymentSession.currency` (verify during implementation; grep `@default("CAD")` for the full list).

**Untouched (explicitly):**
- `Transaction.amount: Float` — precision change is a separate slice.
- `WalletSettings`, `walletBalanceCents`, `walletDebtLimitCents` — already currency-agnostic columns; no change.
- `CommissionSettings`, `RentalSettings`, `FeeSettings` — currency-agnostic percentage / fixed-cents fields.

**Migration shape:**
- One Prisma migration: drop tables, drop enum, alter column type on `Location.regionCode`, alter defaults on all `@default("CAD")` columns. Pre-launch, so safe to run in a single forward migration with no rollback path.

## 5. Server-side changes

### 5.1 Currency literal sweep

Replace hardcoded `"CAD"` in active code paths. The grep target is files that currently match `"CAD"` or `'CAD'` as a string literal in `server/src/**`. Confirmed active sites at design time:

| File | Lines (approx) | Treatment |
|---|---|---|
| `controllers/chauffeur.controller.ts` | 608 | Use `getDefaultCurrency()` helper |
| `controllers/d2d.controller.ts` | 1170, 1193, 1684, 1707 | Use `session.currency ?? getDefaultCurrency()` |
| `controllers/rental.controller.ts` | 580, 624 | Same pattern |
| `controllers/subscription.controller.ts` | 588, 604 | Same pattern |
| `controllers/ride.controller.ts` | 1710 | Same pattern |
| `controllers/transaction.controller.ts` | 524 | Same pattern |
| `services/booking.service.ts` | 60, 429 | Same pattern |
| `services/transaction.service.ts` | 1030, 1097, 1243, 1277, 1340 | Same pattern |
| `services/wallet.service.ts` | 56, 92 | Already env-driven; just flip env default |
| `docs/routes/d2d.docs.ts`, `docs/routes/ride.docs.ts` | Swagger examples | Change example string to `"RWF"` |

Also remove all commented-out `"CAD"` legacy code in `transaction.service.ts` (lines 266–971 contain a large block of commented-out flows; delete rather than carry forward).

### 5.2 New helper: `getDefaultCurrency()`

Single source of truth: `server/src/utils/currency.ts`.

```ts
export const getDefaultCurrency = (): string =>
  process.env.DEFAULT_CURRENCY?.trim() || "RWF";
```

Used wherever a transaction is created without a session-supplied currency. Wallet service updates from `?? "CAD"` to call this helper. New currency-formatting helper for server-side receipt rendering also lives here (see §7).

### 5.3 Tax wiring removal

Files / sections to delete:
- `server/src/utils/tax.ts` — delete entirely.
- Any controller actions that read/write `Tax`, calculate tax amounts, or look up `TaxRate`. Specific routes / handlers identified at implementation time via `git grep` on `TaxRate|prisma.tax\b|Tax\.create|provinceCode`.
- Tax routes / endpoints in `server/src/routes/admin.routes.ts` (tax CRUD endpoints — confirm during implementation).
- `setting.request.validator.ts` and `setting.docs.ts` references to tax fields.
- Translation strings in `translations/en.ts` and `translations/fr.ts` that exist only for tax UI.

### 5.4 Env defaults

- Add `DEFAULT_CURRENCY=RWF` to `server/.env.example`.
- Set `DEFAULT_CURRENCY=RWF` in `docker-compose.yml` server service environment block (verify exact path during implementation).

## 6. Admin (web client) changes

### 6.1 Tab removals

- Delete `client/src/pages/admin/tabs/TaxRatesTab.tsx`.
- Delete `client/src/pages/admin/tabs/TaxesTab.tsx`.
- Remove imports and `<TabsTrigger>` / `<TabsContent>` blocks for `taxRates` and `taxes` from `client/src/pages/admin/AdminDashboard.tsx`.
- Remove any `useTaxRates` / `useTaxes` hooks if they exist in `client/src/hooks/admin/*.ts`.

### 6.2 Currency formatting helper

Replace `formatCurrencyCAD` (referenced from `TaxesTab.tsx:23` and possibly elsewhere) with a single locale-aware helper:

```ts
// client/src/lib/currency.ts
const NO_SUBUNIT = new Set(["RWF", "JPY", "KRW"]); // currencies with no minor unit

export const formatCurrency = (amountCents: number, currency = "RWF"): string => {
  const amount = NO_SUBUNIT.has(currency) ? Math.round(amountCents / 100) : amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: NO_SUBUNIT.has(currency) ? 0 : 2,
    maximumFractionDigits: NO_SUBUNIT.has(currency) ? 0 : 2,
  }).format(amount);
};
```

Sweep call sites: any `formatCurrencyCAD(x)` becomes `formatCurrency(xCents, currency)` where the caller has access to the row's currency. Where the caller does not have a currency in scope (rare), fall back to default RWF.

### 6.3 Region inputs

Wherever the admin UI offers a province dropdown bound to `ProvinceCodes`, switch to a freeform text input. If users don't manage `Location.regionCode` from the admin currently (likely — verify during implementation), this is a no-op.

## 7. Mobile changes

### 7.1 `formatCurrency` extension

`mobile/src/lib/utils.ts` already exposes a `formatCurrency` helper. Extend it to accept a currency arg with the same RWF / no-subunit logic as the client helper. Keep the signature backward-compatible by defaulting `currency = "RWF"`.

### 7.2 Call-site sweep

Anywhere the helper is currently called without a currency arg and the data has one in scope (transactions, wallet ledger entries, ride contributions), thread the currency through. Where currency is genuinely unavailable, the default of RWF is correct for MVP.

### 7.3 Wallet screen

`mobile/src/app/(drawer)/wallet.tsx` formats amounts via the helper. Verify the new RWF-no-decimals output reads cleanly; spot-check typography on the existing layout.

## 8. Display contract (shared across all three codebases)

| Currency | Storage | Display example |
|---|---|---|
| RWF | `12500000` cents | `RWF 125,000` |
| CAD | `1250` cents | `CA$12.50` |
| USD | `1250` cents | `$12.50` |

Whether to show the currency code prefix vs. the locale symbol is up to `Intl.NumberFormat`; we accept whatever browser/JS-runtime defaults give us. No custom symbol mapping in this slice.

## 9. Test plan

Light — this slice is mostly mechanical.

- **Server:** Unit test `getDefaultCurrency()` (env override + fallback). Existing wallet / transaction tests should continue to pass; spot-check that no test hardcodes `"CAD"` in expectations.
- **Client:** Unit test `formatCurrency()` for RWF (no decimals), CAD (two decimals), and rounding behavior at the cent boundary.
- **Mobile:** Same unit tests as client.
- **Manual smoke:** create a ride, create a wallet credit transaction, view in admin and mobile — confirm everything reads `RWF …` end-to-end.
- **Migration:** run `prisma migrate dev` against a clean dev DB, verify the migration applies and rollback (drop dev DB, re-seed) still works.

## 10. Risks & gotchas

- **Lingering tax references in unrelated files.** The 29-file grep for `TaxRate|tax|provinceCode|ProvinceCodes` includes false positives (translations, logger, no-show controller). Implementation must distinguish "imports from prisma.tax" from "happens to contain the word `tax`". The plan should call out a verification step: after deletion, `tsc` should be clean.
- **Translations.** `translations/en.ts` and `translations/fr.ts` may have user-facing strings tied to tax. Decide per-string whether to delete or repurpose. None should be left orphaned.
- **Receipt rendering.** If `PaymentReceipt` rendering currently includes a tax line, that line goes away. Verify the receipt template still renders cleanly without it.
- **Swagger docs.** Several docs files include `currency: "CAD"` examples. They are docs, not behavior, but should still flip to `"RWF"` for accuracy.

## 11. Deviations from source docs

- The 2026-04-16 feature gap analysis (`§2 Cross-cutting`) lists tax-model status as "Partial" and the target as "Rwanda VAT (single rate or none)". This slice picks **none** for MVP, which is the lower-cost option called out in the original target text. Update the gap analysis after this slice ships.
- Slice naming: tracker calls slice 2 "RWF + Rwanda VAT localization". After this slice, "Rwanda VAT" is an explicitly deferred concept; rename the tracker entry to "RWF localization + tax model removal" when the tracker gets updated.

## 12. Implementation footprint estimate

- Schema migration: 1 file.
- Server: ~15 files touched (mostly small literal swaps + deletions). One new helper file. Net LOC likely negative due to commented-code cleanup in `transaction.service.ts`.
- Client: 2 file deletions + 1 new helper + ~5 files swept. Negative net LOC.
- Mobile: 1 helper extension + ~3–6 file sweep.
- Tracker + gap-analysis updates: 2 files.

Single PR. Single review cycle. No deferred work hidden inside.
