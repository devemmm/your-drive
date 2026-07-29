# YourDrive — Consolidated Requirements

**Date:** 2026-04-16
**Audience:** Engineering — used to plan and build the remaining work across milestones M1 (refinement), M2 (bus ticketing), M3 (final).
**Companion:** `2026-04-16-feature-gap-analysis.md` (rationale, status of every original requirement, decisions log)

---

## 1. Context & scope guardrails

### 1.1 Product mandate
A multi-service mobile transport platform for Rwanda covering five services:

1. Car rides (P2P + on-demand inDrive-style)
2. Moto taxi (subset of rides)
3. Car rental
4. Private chauffeur (driver-only, customer's car)
5. Bus ticket booking system

### 1.2 Milestone framing

| Milestone | Goal |
|---|---|
| **M1 — Refinement** | Bring services 1-4 to real-market readiness (gaps from §4 of this doc) |
| **M2 — Bus ticketing** | Build service 5 end-to-end (§5) |
| **M3 — Final** | Real payment-gateway adapters (DPO/MoMo/Airtel), production hardening, reconciliation dashboards (§6) |

### 1.3 Scope guardrails
- Anything in this document is in scope for the milestone it sits under.
- Anything in the gap-analysis Decisions Log (§6 of that doc) is **out** unless the client commits new budget.
- New requests during build that aren't in either doc are scope-creep and must be added here first.

### 1.4 Source of truth precedence
1. This doc + the gap analysis (current scope)
2. `docs/client-requests/*.md` (original requests — superseded where this doc disagrees)
3. The codebase (existing implementation)

---

## 2. Architecture & stack snapshot

| Layer | Stack | Notes |
|---|---|---|
| Backend | Node.js + Express + TypeScript + Prisma + PostgreSQL | `server/` |
| Admin | React + Vite + Tailwind | `client/` |
| Mobile | Expo (React Native) + Expo Router | `mobile/` |
| Push | Firebase Cloud Messaging | `User.fcm_token` |
| SMS | Twilio (RW coverage to verify) | `srv/sms.service.ts` |
| Storage | Cloudinary | `srv/storage.service.ts` |
| Realtime | Socket gateways under `server/src/gateways/` | for chat + location updates |
| Geocoding/Places | Google Places (recently expanded to Africa) | mobile |

The stack is fit for purpose. No platform-level rewrites in this scope.

---

## 3. Cross-cutting work (must land before per-service work)

These cut across all services. The order below is the recommended build order because later items depend on earlier ones.

### 3.1 Localization: currency & tax for Rwanda

**Why:** All transactions currently default to CAD with Canadian provincial taxes. RW launch needs RWF + Rwanda VAT.

**Schema deltas:**
- `Transaction.currency`: change `@default("CAD")` → `@default("RWF")`
- `PaymentSession.currency`: same
- Drop or repurpose `ProvinceCodes` enum:
  - Option A: replace values with Rwandan provinces (`KIGALI`, `EASTERN`, `WESTERN`, `NORTHERN`, `SOUTHERN`)
  - Option B: replace `regionCode ProvinceCodes?` with a free-text `region String?`
  - **Recommended:** A — keeps strong typing and admin pickers
- `TaxRate` model: keep table, add `vat Float?` field; legacy `gst/pst/qst/hst` stay nullable so historical data isn't lost
- Seed: replace Canadian rates with one row per RW province with `vat = 18` (verify with client)
- Drop `Location.country @default("Rwanda")` already in place — confirm

**Code deltas:**
- Replace 9 hardcoded `"CAD"` literals (see grep: `services/booking.service.ts`, `controllers/{chauffeur,d2d,rental,subscription,transaction}.controller.ts`) with constant `DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY ?? "RWF"`
- `srv/utils/tax.ts`: rewrite `computeTax()` to apply VAT instead of summing GST+PST/etc.
- Receipts (`PaymentReceipt`): currency formatting helper that respects RWF (whole-number, no decimals) vs CAD (2dp)

**Acceptance:**
- New `Transaction` rows default to `currency = "RWF"`
- Receipt PDFs/emails show `RWF 12,500` (no decimals)
- Admin `TaxRatesTab` allows editing Rwandan VAT rates
- `prisma migrate` clean from current to new schema; legacy CAD transactions still readable

### 3.2 Payment gateway abstraction

**Why:** Stripe is unavailable in Rwanda. Need to plug in DPO, MTN MoMo, Airtel Money later, and run with a manual-credit gateway in the meantime.

**Schema additions:**

```prisma
model PaymentGateway {
  id             Int      @id @default(autoincrement())
  code           String   @unique          // "MANUAL", "STRIPE", "PAYPAL", "DPO", "MTN_MOMO", "AIRTEL_MONEY"
  displayName    String
  enabled        Boolean  @default(false)
  supportedTypes Json                       // e.g. ["WALLET_TOPUP", "RIDE_BOOKING", "CAR_RENTAL"]
  config         Json?                      // adapter-specific (kept opaque)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

// PaymentProvider enum: keep for backward compat, add MANUAL, CASH, DPO, MTN_MOMO, AIRTEL_MONEY
// (CASH is needed for §5 bus agent cash-collected ticket sales)
```

**Adapter interface** (`server/src/services/payments/`):
```ts
interface PaymentGatewayAdapter {
  code: string;
  initiate(session: PaymentSession): Promise<{ redirectUrl?: string; reference: string }>;
  handleWebhook(req): Promise<{ sessionId: string; status: PaymentSessionStatus }>;
  refund(transaction: Transaction, amount: number): Promise<void>;
}
```

Existing Stripe + PayPal logic moves into `stripe.adapter.ts` and `paypal.adapter.ts`. New `manual.adapter.ts` does no external call — just marks the session paid when admin records a credit.

**Admin work:** New `PaymentGatewaysTab` — list gateways, toggle enabled, edit config JSON.

**Webhook routing:** `/webhooks/:gatewayCode` → adapter dispatch. Existing `/webhook` Stripe route kept as alias.

**MVP enablement:** Only `MANUAL` enabled by default. Stripe + PayPal disabled in seed.

**Acceptance:**
- Admin can enable/disable any gateway without code changes
- Adding a new gateway = drop in one adapter file + one DB row
- Wallet top-up path works through `MANUAL` adapter end-to-end (admin credits via UI, balance increases, ledger entry written)

### 3.3 Driver wallet (manual admin credit MVP)

> **Update 2026-04-18 — minimal-wallet approach for slice 1.** The first-pass wallet ships as a single `User.walletBalanceCents Int` column plus the existing `Transaction` table acting as the ledger (new `TransactionType` values `COMMISSION_DEBIT` and `WALLET_CREDIT`). Debt limit lives in a one-row `WalletSettings` model with a per-user override on `User.walletDebtLimitCents`. See `docs/superpowers/specs/2026-04-18-buses-and-wallet-foundation-design.md` §4 and §7. The full `Wallet` / `WalletLedger` / `WalletTopupRequest` tables below remain the target upgrade path (tracker slice 11) but are deferred until real gateway top-ups land.

**Why:** Replaces Stripe Connect payouts. Drivers pre-fund a wallet to operate; system deducts commission per completed ride. No withdrawal.

**Schema additions:**

```prisma
model Wallet {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance         Decimal  @default(0) @db.Decimal(12, 2)   // RWF, can go negative within debt limit
  currency        String   @default("RWF")
  debtLimit       Decimal  @default(-5000) @db.Decimal(12, 2)  // configurable per-user override
  isFrozen        Boolean  @default(false)
  frozenReason    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  ledger          WalletLedger[]
  topupRequests   WalletTopupRequest[]
}

model WalletLedger {
  id             Int       @id @default(autoincrement())
  walletId       Int
  wallet         Wallet    @relation(fields: [walletId], references: [id], onDelete: Cascade)
  type           WalletLedgerType   // CREDIT_TOPUP, DEBIT_COMMISSION, DEBIT_PENALTY, CREDIT_REFUND, CREDIT_ADJUSTMENT, DEBIT_ADJUSTMENT
  amount         Decimal   @db.Decimal(12, 2)
  balanceAfter   Decimal   @db.Decimal(12, 2)
  transactionId  Int?
  transaction    Transaction? @relation(fields: [transactionId], references: [id])
  topupRequestId Int?
  topup          WalletTopupRequest? @relation(fields: [topupRequestId], references: [id])
  reason         String?
  performedById  Int?      // admin user for manual entries
  createdAt      DateTime  @default(now())
}

model WalletTopupRequest {
  id           Int      @id @default(autoincrement())
  walletId     Int
  wallet       Wallet   @relation(fields: [walletId], references: [id])
  amount       Decimal  @db.Decimal(12, 2)
  gatewayCode  String                                       // "MANUAL" for MVP
  status       TopupStatus @default(PENDING)                // PENDING, COMPLETED, FAILED, CANCELLED
  reference    String?                                       // gateway reference / receipt number for MANUAL
  notes        String?
  createdById  Int?                                          // admin id for MANUAL credits
  approvedById Int?
  approvedAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  ledger       WalletLedger[]
}

enum WalletLedgerType { CREDIT_TOPUP, DEBIT_COMMISSION, DEBIT_PENALTY, CREDIT_REFUND, CREDIT_ADJUSTMENT, DEBIT_ADJUSTMENT }
enum TopupStatus { PENDING, COMPLETED, FAILED, CANCELLED }
```

**Backend services:** `server/src/services/wallet.service.ts`
- `getOrCreateWallet(userId)`
- `credit(walletId, amount, type, ref)` — single transaction, writes ledger + updates `balance`
- `debit(walletId, amount, type, ref)` — checks `balance - amount >= debtLimit`; throws `INSUFFICIENT_BALANCE` if it would breach
- `freeze(walletId, reason)` / `unfreeze(walletId)`

**Charge-from-wallet hook:** When a ride/D2D booking/chauffeur trip completes, deduct platform commission from driver wallet via `debit(...)`. Replace existing Stripe Connect transfer logic.

**Endpoints:**
- `GET /api/wallets/me` — driver-facing balance + recent ledger
- `GET /api/admin/wallets` — list all wallets, filter by frozen / negative
- `POST /api/admin/wallets/:id/topup` — admin records a manual credit (creates `WalletTopupRequest` with status `COMPLETED` + ledger entry)
- `POST /api/admin/wallets/:id/freeze` / `/unfreeze`
- `POST /api/admin/wallets/:id/adjust` — manual credit/debit with audit reason

**Explicitly NOT built (cut):**
- `POST /api/wallets/withdraw` — does not exist
- Driver-facing top-up via gateway (M3 only — for now driver hands cash to admin/agent who records credit)

**Mobile:** Driver drawer: "My wallet" screen showing balance, recent ledger, banner if balance < 0, instructions to top up offline. No top-up button (MVP).

**Admin:** `WalletsTab` — table of drivers, current balance, latest top-up; row actions: top up / freeze / unfreeze / adjust.

**Acceptance:**
- Driver completing a trip sees commission line in ledger within 5s
- Driver hitting debt limit cannot accept new rides until topped up (matchmaking filter)
- Admin top-up: enter amount + receipt # + notes → balance updates, ledger entry visible to driver
- No code path can move money out of a wallet to anywhere except commission/penalty (audited)

### 3.4 Communication: phone dialer button

**Why:** In-app voice calls cut. `tel:` link covers the safety/coordination case at zero cost.

**Mobile work:**
- On `ride/[id]`, `rental/[id]`, `chauffeur/service/[id]` detail screens, add a "Call" button next to existing Chat button
- Behavior: `Linking.openURL('tel:' + counterparty.phoneNumber)`
- **Visibility rule:** Phone shown only after booking is `ACCEPTED` / `CONFIRMED` / `ACTIVE` (not `PENDING`). Mirrors anti-bypass intent.

**Backend:** No new endpoints. Existing user phone field reused. Add per-service helper to return counterparty phone respecting state.

**Acceptance:** Tapping Call on an accepted booking opens the device dialer with the counterparty's number; tapping on a pending booking shows a "Phone available after acceptance" toast.

### 3.5 KYC: background-check status

**Why:** Chauffeur and high-trust services require explicit driver vetting beyond a license image.

**Schema deltas on `User`:**
```prisma
backgroundCheckStatus  KycStatus @default(PENDING)   // PENDING, APPROVED, REJECTED
backgroundCheckNotes   String?
backgroundCheckedAt    DateTime?
backgroundCheckedById  Int?
nationalIdNumber       String?
nationalIdImageId      Int?    @unique
nationalIdImage        Asset?  @relation("NationalId", fields: [nationalIdImageId], references: [id])
selfieImageId          Int?    @unique
selfieImage            Asset?  @relation("Selfie", fields: [selfieImageId], references: [id])

enum KycStatus { PENDING, APPROVED, REJECTED }
```

**AssetCategory:** add `NATIONAL_ID`, `SELFIE`.

**Driver activation gate:**
- `User.isAvailableForChauffeur` and `isAvailableForRideRequest` cannot be flipped to true unless `backgroundCheckStatus = APPROVED`
- Matchmaking filters out non-APPROVED drivers

**Mobile (driver onboarding):** add national ID + selfie capture steps after license upload.

**Admin:** new `KycReviewTab` — list pending drivers with documents side-by-side; Approve / Reject with notes.

**Acceptance:** A new driver completing license + ID + selfie cannot go online until admin approves; activation toggle is disabled with explanatory tooltip on driver app.

### 3.6 Driver agreement & customer risk-disclosure (versioned consent)

**Why:** Liability spec mandates auditable consent.

**Schema additions:**

```prisma
model AgreementVersion {
  id          Int      @id @default(autoincrement())
  type        AgreementType
  version     String                                    // semver e.g. "1.0.0"
  bodyHtml    String                                    // rendered to user
  effectiveAt DateTime
  createdAt   DateTime @default(now())
  acceptances UserAgreementAcceptance[]
  @@unique([type, version])
}

model UserAgreementAcceptance {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  agreementId     Int
  agreement       AgreementVersion @relation(fields: [agreementId], references: [id])
  acceptedAt      DateTime @default(now())
  ipAddress       String?
  userAgent       String?
  deviceFingerprint String?
}

enum AgreementType { DRIVER_TERMS, CUSTOMER_RISK_DISCLOSURE, GENERAL_TOS }
```

**Activation gate:** Driver activation requires latest `DRIVER_TERMS` acceptance. Each chauffeur booking shows latest `CUSTOMER_RISK_DISCLOSURE` to customer with explicit "I agree" before payment.

**Endpoints:**
- `GET /api/agreements/latest?type=DRIVER_TERMS`
- `POST /api/agreements/:id/accept` — captures IP + UA + device

**Admin:** new `AgreementsTab` to publish new versions (existing acceptances remain valid; new flow forces re-accept on next sensitive action).

**Acceptance:** Acceptance row written with non-empty `ipAddress` and `userAgent`; if a new version is published, driver is forced to re-accept on next app open.

### 3.7 Safety: SOS, live trip-share, GPS trail

**Why:** Mandatory per chauffeur safety spec; useful for all moving services.

**Schema additions:**

```prisma
model TripGpsPoint {
  id              Int      @id @default(autoincrement())
  rideId          Int?
  d2dBookingId    Int?
  chauffeurServiceId Int?
  rentalId        Int?
  userId          Int                                   // who reported (driver or customer)
  latitude        Float
  longitude       Float
  accuracy        Float?
  speed           Float?
  heading         Float?
  recordedAt      DateTime
  createdAt       DateTime @default(now())
  @@index([rideId, recordedAt])
  @@index([d2dBookingId, recordedAt])
  @@index([chauffeurServiceId, recordedAt])
}

model SosEvent {
  id              Int       @id @default(autoincrement())
  userId          Int
  user            User      @relation(fields: [userId], references: [id])
  rideId          Int?
  d2dBookingId    Int?
  chauffeurServiceId Int?
  latitude        Float
  longitude       Float
  status          SosStatus @default(OPEN)              // OPEN, ACKNOWLEDGED, RESOLVED, FALSE_ALARM
  notes           String?
  acknowledgedById Int?
  acknowledgedAt  DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime  @default(now())
}

model TripShareLink {
  id              Int       @id @default(autoincrement())
  token           String    @unique                      // signed, opaque
  rideId          Int?
  d2dBookingId    Int?
  chauffeurServiceId Int?
  createdById     Int
  createdAt       DateTime  @default(now())
  expiresAt       DateTime
  revokedAt       DateTime?
}

enum SosStatus { OPEN, ACKNOWLEDGED, RESOLVED, FALSE_ALARM }
```

**Mobile:**
- During any active trip (P2P, D2D, chauffeur, rental in-progress) the app posts GPS points every 10s to `POST /api/gps/batch`
- "SOS" floating button on active trip screens → confirmation modal → POST to `/api/sos`
- "Share trip" action → server returns shareable URL + creates `TripShareLink`; user shares via OS share sheet
- Recipient hits a public web page (no auth) showing live driver location until trip ends or link revoked

**Backend:**
- `POST /api/gps/batch` — accepts arrays; trusts only authenticated user; rate-limited
- `POST /api/sos` — creates `SosEvent`, fires push to admin + user's `emergencyContactName/Phone` via SMS
- `POST /api/trips/:id/share` — issues link
- `GET /share/:token` — public route (no auth) returns last N GPS points + driver name (no phone)

**Admin:** new `IncidentsTab` (combined with §3.8 incidents) showing `SosEvent` list with map preview; ack + resolve actions.

**Acceptance:**
- Active trip is plotted on admin live map
- SOS triggered from passenger app pushes to admin within 5s and SMS to emergency contact within 30s
- Share link viewed without auth shows real-time location updating every 10s

### 3.8 Trip evidence (pre/post photos)

**Why:** Chauffeur and rental need photographic proof of vehicle condition.

**Schema:** `AssetCategory` enum: add `TRIP_EVIDENCE`.

`Asset` already has metadata fields needed; add to existing model:
```prisma
capturedAt   DateTime?
gpsLatitude  Float?
gpsLongitude Float?
```

**Mobile (chauffeur and rental flows):**
- Pre-trip step (after acceptance, before "Start trip"): customer captures 4 angle photos (front/back/left/right) + optional interior. Camera uses native picker; geotags + timestamps captured
- Post-trip step (after "End trip"): same capture; driver may also upload
- Trip cannot transition to `ACTIVE` (rental/chauffeur) until pre-trip photos uploaded OR explicit skip recorded

**Backend:** `POST /api/trips/:id/evidence` — accepts asset uploads with `phase: 'PRE'|'POST'`, links to trip.

**Admin:** Trip detail dialog shows evidence gallery side-by-side (pre vs post).

**Acceptance:** A chauffeur trip cannot leave `ACCEPTED` for `ACTIVE` without 4 pre-trip photos or a logged skip; post-trip prompt fires when driver marks completed.

### 3.9 Incident reporting

**Why:** Disputes, accidents, damage, misconduct all need a structured intake + admin resolution.

**Schema:**

```prisma
model Incident {
  id              Int       @id @default(autoincrement())
  reporterId      Int
  reporter        User      @relation("IncidentReporter", fields: [reporterId], references: [id])
  subjectUserId   Int?
  subject         User?     @relation("IncidentSubject", fields: [subjectUserId], references: [id])
  type            IncidentType
  description     String
  rideId          Int?
  d2dBookingId    Int?
  chauffeurServiceId Int?
  rentalId        Int?
  status          IncidentStatus @default(SUBMITTED)
  resolution      IncidentResolution?
  resolutionNotes String?
  reviewedById    Int?
  reviewedAt      DateTime?
  resolvedAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  attachments     Asset[]   @relation("IncidentAttachments")
  gpsSnapshot     Json?                                  // captured on submission
}

enum IncidentType { ACCIDENT, VEHICLE_DAMAGE, THEFT, DRIVER_MISCONDUCT, CUSTOMER_MISCONDUCT, OTHER }
enum IncidentStatus { SUBMITTED, UNDER_REVIEW, RESOLVED }
enum IncidentResolution { APPROVED_CLAIM, REJECTED, PARTIAL_COMPENSATION, PENALTY_APPLIED }
```

**Backend:**
- `POST /api/incidents` — creates with auto-attached trip GPS + timestamps
- Admin endpoints to update status, attach resolution, apply penalty (deducts from wallet)

**Mobile:** "Report an issue" entry from trip detail screen (post-completion or during dispute window) → form (type, description, photo/video uploads).

**Admin:** `IncidentsTab` with filters by type/status; resolution actions (approve, reject, partial, penalize).

**Acceptance:** Incident submitted from mobile shows up in admin within 5s with auto-attached GPS + trip metadata; admin penalty action debits driver wallet.

### 3.10 Coupon redemption UI on mobile

**Why:** Backend coupon engine + redemption rules exist; users have no way to enter a code on mobile.

**Mobile:**
- On checkout/payment screens (`ride-request` confirm, `chauffeur` book, `rental` book): "Have a coupon?" link → input field
- POST to existing `/api/coupons/redeem-preview` (build if missing) returning new total + discount line
- Apply on confirm; coupon consumed via existing `RedeemedCoupon` flow

**Backend:** ensure preview endpoint exists; otherwise add `POST /api/coupons/preview` taking `{ code, target, baseAmount }` and returning `{ discount, newTotal, valid, reason }`.

**Acceptance:** A valid coupon entered before payment reduces the displayed total and creates a `RedeemedCoupon` row tied to the resulting transaction.

---

## 4. Milestone 1 — refinement of delivered services

Only residual gaps. Items already Built per the gap analysis are not repeated.

### 4.1 Core rides + moto taxi

**Pricing engine (NEW)**

Schema:
```prisma
model PricingSettings {
  id              Int      @id @default(autoincrement())
  vehicleCategory VehicleCategory                        // CAR or MOTORBIKE
  rideType        RideType                                // P2P or D2D
  baseFare        Decimal  @db.Decimal(10, 2)
  perKm           Decimal  @db.Decimal(10, 2)
  perMinute       Decimal  @db.Decimal(10, 2)
  minimumFare     Decimal  @db.Decimal(10, 2)
  currency        String   @default("RWF")
  isActive        Boolean  @default(true)
  effectiveFrom   DateTime @default(now())
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([vehicleCategory, rideType, isActive])
}
```

`srv/pricing.service.ts`: `estimateFare({ vehicleCategory, rideType, distanceKm, durationMin })` returns `{ baseFare, perKm, perMin, total, minimum, applied }`.

`RideRequest` flow uses estimate as the **default proposed fare** (driver's `proposedFare` still allowed but bounded ±N%).

Admin `PricingSettingsTab`: edit per category × type.

**ETA to pickup:** Surface ETA in mobile request flow (Google Distance Matrix). Cache 60s.

**Driver matching enhancements:**
- On driver cancel/timeout (configurable, default 20s): re-broadcast to next driver, max 3 rounds, then mark request `EXPIRED` and refund passenger
- Filter: wallet balance > debtLimit, KYC APPROVED, online, vehicle category matches

**Vehicle tiers:** add to `Vehicle` model:
```prisma
tier VehicleTier? // ECONOMY, PREMIUM
enum VehicleTier { ECONOMY, PREMIUM }
```
Tier surfaced in `PricingSettings` (extend unique key) and matchmaking filter.

**SMS notification fallback:** Add helper that sends SMS via Twilio when push fails or `notificationPref = SMS`. Used for: driver assigned, driver arrived, payment confirmed.

### 4.2 Car rental

**Vehicle metadata gaps:**
```prisma
transmission  Transmission? // MANUAL, AUTOMATIC
fuelType      FuelType?     // PETROL, DIESEL, ELECTRIC, HYBRID
status        VehicleStatus @default(AVAILABLE) // AVAILABLE, MAINTENANCE, DISABLED
enum Transmission { MANUAL, AUTOMATIC }
enum FuelType { PETROL, DIESEL, ELECTRIC, HYBRID }
enum VehicleStatus { AVAILABLE, MAINTENANCE, DISABLED }
```

**Calendar (partner-side):**
- Mobile (or admin-side for now): partners can mark blocked date ranges → new `VehicleBlockedRange { vehicleId, from, to, reason }`
- Booking creation rejects overlap with active rentals OR blocked ranges

**Cancellation rule engine:** `srv/rental.service.ts` `computeCancellationRefund(rental, now)` returning refund amount based on configurable `RentalCancellationPolicy` (24h=100%, 12-24h=80%, <12h=50%; admin-editable). Apply automatically on cancel.

**Late return penalties:** scheduled job (every 15min) checks `endDate < now` for `ACTIVE` rentals; sends warning notification, then auto-applies hourly penalty after grace period from `RentalSettings.overdueGracePeriodHours`.

**Condition reports:** uses §3.8 evidence flow at pickup and return. Deposit decision UI in admin: "Refund full" / "Partial deduct" with reason → triggers refund ledger entry.

**Standardized cancellation policy text** in mobile booking confirm screen (pulled from settings).

**Anti-bypass:** Hide partner phone until booking `APPROVED`. Use §3.4 visibility rule.

**Partner earnings dashboard:** new admin sub-view per partner showing total earnings, payout queue, completion rate.

### 4.3 Chauffeur service

**Request enhancements:**
- Add to `ChauffeurService` model: `requiredTransmission Transmission?`, `isDrunkAssistance Boolean @default(false)`, `isVip Boolean @default(false)`
- Mobile request screen exposes these as toggles

**Pricing:** `ChauffeurPricingSettings` model (mirrors §4.1 PricingSettings: base, per-km, per-min, minimum, **night surcharge multiplier + start/end hours**, **waiting fee per minute**)

**Matching:** quality-first filter — `backgroundCheckStatus = APPROVED`, `averageRating >= 4.0`, `completedTrips >= 5` (admin configurable). NOT nearest. Driver gets 30s acceptance window.

**Arrival verification:**
- Driver app on arrival shows 4-digit PIN; customer reads PIN to driver who enters in driver app, OR customer scans driver-shown QR
- New `ChauffeurArrivalCode { chauffeurServiceId, code, verifiedAt }`
- Trip cannot start until verified

**Pre/post evidence:** §3.8.

**Trip lifecycle hardening:**
- Driver cannot move `ACTIVE → COMPLETED` without GPS endpoint reasonably matching dropoff
- Both must confirm completion (driver marks complete → customer prompted; auto-confirm after 24h if no dispute)
- Dispute opens → escrow held, incident flow triggered

**Cancellation rule engine:** state-aware, per the spec:
- `REQUESTED` (no driver yet) → free
- `ACCEPTED` within 5min grace → 5% fee (3% to driver, 2% platform, rest refunded)
- `ACCEPTED` after grace → 20% of estimate or `MIN_FEE` whichever larger
- `DRIVER_ARRIVED` → 50% of estimate
- `ACTIVE` → cannot cancel; must trigger emergency stop or admin intervention

Schema: `CancellationPolicy` table (rentals + chauffeur share).

**No-show flow:**
- Driver "Arrived" tap requires GPS within 100m of pickup → marks `DRIVER_ARRIVED`
- Free wait 5min, paid wait per minute thereafter (uses pricing waiting fee)
- After 5min driver can mark `CUSTOMER_NO_SHOW` → cancellation fee applied to customer
- Customer can dispute via incident flow; admin reviews GPS log

**Auto-cancel:**
- Driver assigned but doesn't move toward pickup for 5min → auto-cancel, customer refund, driver penalty (rating impact + cancellation count)
- Driver doesn't arrive within `ETA + 50% buffer` → same

**Driver risk scoring (lightweight):**
- Job runs nightly: compute `cancellationRate = cancelled / accepted (last 30d)`, `incidentRate = incidents / completed`
- If cancellationRate > 15% → temporary suspension flag (`User.suspendedAt`, `suspendUntil = now + 7d`)
- Surfaced in admin

**Trip monitoring (basic):**
- Route deviation: compare GPS trail to expected polyline; deviation > 1km for >3min → push admin alert (no auto-action)
- Speed: ignore (not in MVP)

**Profile additions:** `User.languagesSpoken Json?` (array of language codes), display in chauffeur picker.

**Favorite drivers, multi-stop, "stay with me":** **Cut from M1**, mark as M3 if budget allows. Confirm with client.

---

## 5. Milestone 2 — Bus ticketing system

> **Update 2026-04-18 — architecture pivot.** The bus module rides on the existing `Ride` / `Booking` / `BookingSeat` machinery. A scheduled bus trip = a `Ride` with `vehicle.category = BUS` and `routeId` → `BusRoute`. Passenger booking, seat attendance, notifications, and settlement all reuse existing code paths. Only `BusRoute` + `BusRouteStop` are genuinely new tables. Signed QR, offline scanner, agent flow, and SMS/USSD are cut or deferred. The §5.2 parallel-module schema below is superseded by the slice-1 spec (`docs/superpowers/specs/2026-04-18-buses-and-wallet-foundation-design.md`); keep this section as historical reference but plan new work from that spec. Agent flow (§5.4), SMS/USSD (§5.7–8), and reconciliation (§5.9) become separate deferred slices — see `docs/superpowers/tracking/implementation-status.md`.

Entirely new module. Detailed enough here to drive an implementation plan; not so detailed it pre-empts design discussions during M1.

### 5.1 New roles

`UserRole` enum: add `AGENT`, `BUS_DRIVER`. Existing `USER` and `ADMIN` keep semantics.

### 5.2 Schema (additions)

```prisma
model BusOperator {
  id          Int      @id @default(autoincrement())
  name        String
  contactPhone String
  isActive    Boolean  @default(true)
  buses       Bus[]
  routes      BusRoute[]
  agents      User[]   @relation("OperatorAgents")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Bus {
  id          Int      @id @default(autoincrement())
  operatorId  Int
  operator    BusOperator @relation(fields: [operatorId], references: [id])
  plateNumber String   @unique
  capacity    Int
  driverId    Int?
  driver      User?    @relation("BusDriver", fields: [driverId], references: [id])
  trips       BusTrip[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model BusRoute {
  id           Int       @id @default(autoincrement())
  operatorId   Int
  operator     BusOperator @relation(fields: [operatorId], references: [id])
  originCity   String
  destCity     String
  distanceKm   Float
  basePrice    Decimal   @db.Decimal(10, 2)
  isActive     Boolean   @default(true)
  stops        BusRouteStop[]
  trips        BusTrip[]
  createdAt    DateTime  @default(now())
  updatedAt   DateTime @updatedAt
}

model BusRouteStop {
  id        Int    @id @default(autoincrement())
  routeId   Int
  route     BusRoute @relation(fields: [routeId], references: [id], onDelete: Cascade)
  name      String
  city      String
  order     Int
  latitude  Float?
  longitude Float?
}

model BusTrip {
  id              Int       @id @default(autoincrement())
  busId           Int
  bus             Bus       @relation(fields: [busId], references: [id])
  routeId         Int
  route           BusRoute  @relation(fields: [routeId], references: [id])
  departureAt     DateTime
  estimatedArrivalAt DateTime
  status          BusTripStatus @default(SCHEDULED)
  actualDeparturedAt DateTime?
  actualArrivalAt DateTime?
  seats           BusSeat[]
  tickets         BusTicket[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model BusSeat {
  id        Int       @id @default(autoincrement())
  tripId    Int
  trip      BusTrip   @relation(fields: [tripId], references: [id], onDelete: Cascade)
  seatNumber String
  status    BusSeatStatus @default(AVAILABLE)
  lockedUntil DateTime?
  ticket    BusTicket?
  @@unique([tripId, seatNumber])
}

model BusTicket {
  id              Int       @id @default(autoincrement())
  ticketCode      String    @unique                       // human-readable e.g. BT-7G2K-9P
  qrPayload       String                                  // signed JWT-style payload, see §5.5
  tripId          Int
  trip            BusTrip   @relation(fields: [tripId], references: [id])
  seatId          Int       @unique
  seat            BusSeat   @relation(fields: [seatId], references: [id])
  passengerName   String
  passengerPhone  String
  boardingStopId  Int?
  alightingStopId Int?
  status          BusTicketStatus @default(VALID)         // VALID, USED, REFUNDED, CANCELLED
  scannedAt       DateTime?
  scannedById     Int?                                    // bus driver / agent who scanned
  transactionId   Int?      @unique
  transaction     Transaction? @relation(fields: [transactionId], references: [id])
  soldByAgentId   Int?                                    // when sold by agent (cash)
  channel         TicketChannel                            // APP, AGENT, SMS, USSD
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  scans           BusScanLog[]
}

model BusScanLog {
  id        Int      @id @default(autoincrement())
  ticketId  Int
  ticket    BusTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  scannedById Int?
  scannedAt DateTime @default(now())
  result    ScanResult                                     // VALID, DUPLICATE, EXPIRED, INVALID_SIGNATURE
  deviceId  String?
  syncedAt  DateTime?                                      // null if scanned offline, set on sync
}

enum BusTripStatus { SCHEDULED, BOARDING, EN_ROUTE, ARRIVED, CANCELLED }
enum BusSeatStatus { AVAILABLE, LOCKED, SOLD }
enum BusTicketStatus { VALID, USED, REFUNDED, CANCELLED }
enum TicketChannel { APP, AGENT, SMS, USSD }
enum ScanResult { VALID, DUPLICATE, EXPIRED, INVALID_SIGNATURE }
```

`TransactionType`: add `BUS_TICKET`.

### 5.3 Booking flow (mobile app)

1. Search: origin city + dest city + date → list of `BusTrip` with seat counts, fare, departure time
2. Select trip → seat picker (visual grid of `BusSeat`)
3. Lock seat (`BusSeatStatus = LOCKED`, `lockedUntil = now + 3min`)
4. Enter passenger name + phone (defaults to logged-in user)
5. Pay via wallet / gateway (per §3.2)
6. On payment success: seat → `SOLD`, ticket created with QR
7. Ticket displayed in app; SMS sent with `ticketCode`

Lock release: scheduled job runs every 30s, releases seats whose `lockedUntil < now` and no payment.

### 5.4 Booking flow (agent — admin app or agent mobile view)

Agent role logs in to a stripped admin view. Searches trips. Picks seats. Enters passenger details. Records cash payment (creates `Transaction` with `paymentProvider = CASH`, `status = PAID`). Prints ticket (PDF view with QR + details).

Per-agent commission tracked via new `AgentCommissionSettings` (flat % of ticket). Daily settle batch debits agent wallet for cash collected minus commission.

### 5.5 QR ticket structure (signed, offline-validatable)

QR encodes a JWS-style payload signed with platform RSA private key:

```json
{
  "tid": 12345,                        // ticket id
  "code": "BT-7G2K-9P",
  "trip": 678,
  "seat": "12A",
  "from": "Kigali",
  "to": "Huye",
  "dep": "2026-04-20T08:00:00Z",
  "iat": 1745136000,
  "exp": 1745222400                    // 24h after departure
}
```

Signature appended. Scanner app holds the public key locally and can validate without internet. Online mode adds a server check against `BusTicket.status` and writes `BusScanLog`.

**Anti-double-scan offline:** scanner stores local `Set<ticketId>` of scanned IDs; on second scan returns `DUPLICATE`. On sync, server reconciles — if multiple scanners scanned same ticket (rare), admin gets a flag.

### 5.6 Scanner app

Lightweight Expo app (or new tab in driver app) for `BUS_DRIVER` role.
- Auth via existing OTP
- Trip selection (today's trips for assigned bus)
- Camera-based QR scanner
- Offline queue with periodic sync
- Visual feedback: green check / red X

### 5.7 SMS booking flow

Inbound SMS handler (Twilio or local SMS provider with shortcode):

```
KIGALI HUYE 2 20APR 08:00
```

Parser → returns up to 3 trip options as numbered SMS reply:
```
1. 08:00 Volcano Express RWF 5000
2. 09:00 Horizon Coach RWF 4500
Reply with 1, 2 or 3
```

User replies number → system locks seat (next available in that trip), sends MoMo USSD push (M3) or returns ticket code if pre-paid wallet has balance.

For MVP without MoMo, SMS booking is **disabled by config** but parser + handlers are built and tested with stubs.

### 5.8 USSD booking flow

Partner with a USSD aggregator (e.g., Africa's Talking) hitting `/api/ussd/callback`:

Menu tree:
```
1. Book ticket
2. Check ticket
9. Help
```

Steps for "Book ticket": route → date → time → seat count → confirm → payment.

USSD session is stateless on aggregator side; we maintain `UssdSession { sessionId, userPhone, state, payload }` server-side, expire after 5min.

### 5.9 Reconciliation

Daily job: for each operator, compute `(tickets sold today) vs (transactions PAID today for type=BUS_TICKET)`. Mismatches surface in admin `BusReconciliationTab` with drill-down.

### 5.10 Cancellation rules

Configurable in `BusCancellationPolicy`:
- ≥30min before departure → 100% refund
- 15-30min before → 30% refund (per client doc)
- <15min or no-show → 0% refund

Refund hits the original payment source (wallet for app, MoMo refund queue for direct MoMo).

### 5.11 Admin tabs (new)

`BusOperatorsTab`, `BusesTab`, `BusRoutesTab`, `BusTripsTab`, `BusTicketsTab`, `AgentsTab`, `BusReconciliationTab`, `BusFraudTab`.

### 5.12 Acceptance for M2

- A passenger can buy + pay for + scan a bus ticket end-to-end via app
- An agent can sell a printed ticket for cash and have it scanned at boarding
- A scanner offline can validate a QR and mark it used; on reconnect it syncs and reflects in admin
- Reconciliation report flags any seat sold without payment or any payment without ticket within 24h

---

## 6. Milestone 3 — Final

### 6.1 Real payment gateway adapters
- DPO Group adapter (handles cards + bank + MoMo aggregation)
- MTN MoMo Open API direct adapter
- Airtel Money Open API direct adapter
- All implement `PaymentGatewayAdapter` interface from §3.2
- Driver-facing top-up via gateway: new `WalletTopupRequest` rows with `gatewayCode != 'MANUAL'`

### 6.2 Production hardening
- Webhook idempotency (every adapter)
- Stripe + PayPal adapters confirmed off (or removed if confirmed unwanted)
- Background job monitoring (Bull / Agenda metrics)
- Rate limits per endpoint per IP/user
- Audit logs centralized (extend existing logger)

### 6.3 Reconciliation dashboards (cross-service)
- Daily settlement report (rides + rentals + chauffeur + bus) per gateway
- Failed payouts queue
- Driver wallet aging (negative balances aged > 7d for action)

### 6.4 Optional (subject to client confirmation)
- Favorite drivers (chauffeur)
- Multi-stop trips (chauffeur)
- "Stay with me" (chauffeur waits and returns)
- Multi-vehicle Economy/Premium tiers if not delivered in M1

---

## 7. Out-of-scope (explicitly not building)

Mirrors §6 of the gap analysis. Listed here to keep this doc self-contained:

- In-app voice calls (replaced with `tel:` button)
- Cash payments to drivers (rides) — only bus agents collect cash
- Driver wallet withdrawal endpoint (regulator + AML posture)
- Surge / dynamic pricing
- Ride pooling / shared trips
- Heatmaps (driver-facing demand viz)
- GPS spoofing detection
- First-ride / promo-code generator (use existing coupons issued by admin instead)
- Apple / Google sign-in (already removed)
- Stripe / PayPal as live RW payment methods (kept as adapter scaffolding only)

---

## 8. Open questions for client

These need a client decision before the relevant work starts:

1. **Driver wallet debt limit in RWF** — client originally said "-$5"; what's the local equivalent? (~5,000 RWF?)
2. **Rwanda VAT rate** — confirm 18% or other; any service exemptions?
3. **Cancellation fees in RWF** — minimum chauffeur cancellation fee (originally "$2-$5")
4. **Agent commission rate** — flat % per bus ticket sold (5%? 8%?)
5. **Bus operator onboarding** — will the platform team onboard operators manually for launch, or do operators self-serve?
6. **SMS provider for Rwanda** — confirm Twilio works in Rwanda (deliverability + cost) or pick a local provider
7. **USSD shortcode** — does the client have one allocated, or does the platform need to acquire one?
8. **Background-check provider** — manual admin review with uploaded documents, or integrate with a vendor (e.g., Smile Identity, Trulioo)?
9. **Apple/Google sign-in removal** — confirm the removal is intentional
10. **Multi-vehicle tiers** — Economy/Premium needed for launch, or deferred?
11. **Favorite drivers / multi-stop / "stay with me"** — keep in M3 or cut entirely?
12. **Bus driver phone-number visibility to passengers** — show or hide?

---

## 9. Glossary

- **D2D** — Door-to-door, used in code to mean on-demand inDrive-style ride (`prisma RideRequest` + `D2DBookingRequest`)
- **P2P** — Peer-to-peer, driver-posted scheduled ride with seats
- **Wallet ledger** — append-only record of credits/debits; running balance never derived on the fly except as a check
- **Gateway adapter** — pluggable implementation of payment integration; one per provider
