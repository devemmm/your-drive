# YourDrive — Feature Gap Analysis

**Date:** 2026-04-16
**Last reviewed:** 2026-06-02 (post-implementation audit; see §10 for net-new work since this doc was first written)
**Audience:** Engineering (used as input to the consolidated requirements doc and future implementation plans)
**Source of truth for client requirements:** `docs/client-requests/*.md`
**Companion doc:** `2026-04-16-consolidated-requirements.md`

> **Status as of 2026-06-03:** the originally-tracked scope is **~100% of contract scope complete**. Driver wallet, KYC, pricing settings, vehicle tiers, cancellation rules, vehicle transmission/fuel, languages spoken, trip reports (incident MVP), the bus slice 1, and (2026-06-02) **guest browse + just-in-time auth** have all moved to **Built**. What's left is a handful of M1 polish items (chauffeur arrival OTP, dual confirm, driver agreement versioning, condition-photo capture, long-rental discount) and items already flagged Open / Cut / Out-of-scope. A large net-new feature — driver-initiated **counter-offer bidding** — landed in this window and is documented in §10.

---

## 1. How to read this doc

Every row maps to a specific item in the original client requirements. The Status column tells you whether action is needed and where to find the detailed work in the consolidated requirements doc.

### Legend

| Status | Meaning | Action |
|---|---|---|
| **Built** | Implemented end-to-end (backend + UI where applicable). May still be tweaked but no new spec needed. | None — verify only |
| **Partial** | Backend or UI in place but missing the other half, or covers happy path only. | Finish in M1 refinement |
| **Missing** | Not in code at all. | Build per consolidated reqs |
| **Deferred** | Planned but explicitly pushed to a later milestone. | Build in stated milestone |
| **Cut** | Will not be built. Scope decision recorded in §6. | None — push back if client asks |

### Code-location shorthand

- `prisma`: `server/prisma/schema.prisma`
- `srv/<area>`: `server/src/{controllers,services,routes}/<area>.*`
- `mobile/<screen>`: `mobile/src/app/<area>` or `mobile/src/components/<name>`
- `admin/<tab>`: `client/src/pages/admin/tabs/<name>.tsx`

---

## 2. Cross-cutting status snapshot

| Concern | Current state | Target state | Status |
|---|---|---|---|
| **Currency** | Hardcoded `CAD` in 9 files, default `"CAD"` on `Transaction` and `PaymentSession` (`prisma`) | `RWF` default, locale-aware formatting, multi-currency tolerated | **Built** (slice 2 — 2026-05-04) |
| **Tax model** | Canadian GST/PST/QST/HST + `ProvinceCodes` enum (`prisma TaxRate`, `Tax`) | Rwanda VAT (single rate or none), province enum removed/replaced | **Built** (slice 2 dropped tax pipeline) |
| **Country / region defaults** | `Location.country @default("Rwanda")` already, but `regionCode` typed as Canadian `ProvinceCodes` enum | Rwanda provinces (Kigali, Eastern, Western, Northern, Southern) or freeform region | **Built** (slice 2) |
| **Payments** | Stripe + PayPal adapters hardcoded; `paymentProvider` enum has only `STRIPE`/`PAYPAL` (`prisma PaymentProvider`); Stripe Connect for driver payouts | Gateway abstraction; admin enables/disables gateways; MVP = `MANUAL` admin credit; M3 adds DPO/MoMo/Airtel | **Deferred** — user cut gateway-abstraction scope on 2026-05-17 (still M3) |
| **Driver wallet** | No `Wallet` model — driver balance derived from `Transaction` history | Slice 1 (2026-04-18): minimal `User.walletBalanceCents` column + `WalletSettings` + existing `Transaction` as ledger + debt-limit gate + admin manual credit. Full `Wallet` + `WalletLedger` + `WalletTopupRequest` tables become tracker slice 11 (upgrade path). **No withdrawal endpoint** (regulatory / §6 decisions log). | **Built** (slice 1) |
| **Voice comms** | Not implemented | `tel:` button on detail screens (no in-app voice) | **Built** (2026-05-17) — wired on active ride, ride detail, ride-request waiting, chauffeur service detail |
| **Chat** | Threads + messages + read receipts + per-thread mounts (`prisma ChatThread`, `srv/chat`) | Unchanged | **Built** |
| **Push / SMS** | FCM tokens on `User` (`fcm_token`); Twilio SMS service (`srv/sms.service.ts`) | Unchanged for app push; SMS gateway must support Rwanda (validate Twilio coverage or swap) | **Built (verify)** — note: `config/email.ts` is now a no-op shim, so all email-driven notifications use FCM instead until email infra returns |
| **KYC** | License front/back images (`prisma LicenseImages`); no background-check field | Admin-approval workflow on driver (license already collected) + vehicle (yellow card + photos + insurance + authorization). `kycStatus` on User + Vehicle gates online toggle, vehicle creation, and ride creation. National ID / selfie / background-check vendor **descoped** to MVP per 2026-05-17 client direction. | **Built** (2026-05-17) |
| **Driver agreement** | `User.termsAccepted: Boolean` only | Versioned agreement with timestamp + IP + device, gates driver activation | **Partial** — boolean still in place; `AgreementVersion`/`UserAgreementAcceptance` models not yet built |
| **Safety** | None | SOS button, live trip-share link, GPS trail storage during active trip | **Partial** — Trip reports flow added (2026-05-17): driver/passenger can flag a trip from active screen, admin sees red-row + ReportsTab. SOS / GPS trail / trip-share descoped to MVP per 2026-05-17 — still pending. |
| **Evidence capture** | Asset categories: `VEHICLE_IMAGE`, `LICENSE`, `PROFILE_PICTURE`, `OTHER` | Add `TRIP_EVIDENCE`; pre/post photo flow for chauffeur and rental | **Partial** — `TRIP_EVIDENCE` category added to enum (2026-05-17). Capture UI deferred. |
| **Incident reporting** | None | `Incident` model + admin resolution flow | **Partial** — `RideReport` model + admin Reports tab covers the basic flag/review/dismiss flow. Full `Incident` with type taxonomy + resolution decisions deferred. |

---

## 3. Per-service gap tables

### 3.1 Core ride-hailing (incl. moto taxi)

Source: `docs/client-requests/core-ride-hailing.md`

| # | Requirement | Status | Where it lives / what's missing |
|---|---|---|---|
| 1.1 | Phone signup + OTP | **Built** | `srv/auth`, `srv/onboarding`; `User.phoneVerificationCode*` |
| 1.1 | Basic profile + photo | **Built** | `prisma User`, `Asset PROFILE_PICTURE` |
| 1.1 | Default payment method | **Partial** | Card flow exists (`srv/card`); needs gateway abstraction (§3.2 cross-cutting) |
| 1.1 | Location permission | **Built** | `mobile/hooks/useCurrentLocation` |
| 1.2 | Real-time GPS, map, pickup pin, drop-off autocomplete, route preview | **Built** | `mobile/HomeBottomSheet`, Places API expanded to Africa (commit `550put0a`) |
| 1.3 | Ride request flow (destination → fare → vehicle types → confirm) | **Built** | `mobile/app/ride-request`, `prisma RideRequest`, `RideRequestMatch`. Passenger now sets a `proposedFare`; counter-offer bidding (see §10) lets drivers bid against it. |
| 1.3 | ETA, distance/duration estimate | **Partial** | Distance shown; ETA to pickup not surfaced consistently |
| 1.3 | Surge pricing | **Cut** (§6) | Out of scope — no demand-based pricing engine |
| 1.4 | Find available driver, send request, timeout, auto-reassign | **Built (model changed)** | Replaced by counter-offer bidding (see §10): drivers self-select and bid against `proposedFare`. Passenger picks a bid; `acceptBid` atomically creates the Ride+Booking and marks all other pending bids DECLINED. "Auto-reassign on timeout" superseded by "passenger sees all bids, picks one at any time before request expires". |
| 1.5 | Driver online/offline toggle | **Built** | `User.isAvailableForRideRequest`, `isAvailableForChauffeur` |
| 1.5 | Accept/reject, navigation, start/end trip, earnings | **Built** | `srv/d2d`, `srv/ride`; mobile driver actions per recent commits |
| 1.6 | Trip lifecycle states + notifications + UI updates | **Built** | `D2DBookingRequestStatus`, `RideStatus` enums; notification triggers |
| 1.7 | Pricing — base fare, per-km, per-min, minimum fare | **Built** (2026-05-17) | `PricingSettings` per (vehicleCategory × rideType) with base/perKm/perMin/min + `commissionPercent`. Public `/fare-estimate` endpoint. Mobile ride-request pre-fills `proposedFare` using haversine + estimate. Admin `PricingSettingsTab` for CRUD. |
| 1.8 | Cash payment | **Cut** (§6) | Out — wallet-only model; cash undermines commission collection |
| 1.8 | Mobile money (MTN/Airtel) | **Deferred** (M3) | Gateway abstraction needed first |
| 1.8 | Card payments | **Built** (Stripe) | Will become one adapter among many |
| 1.8 | Auto fare calculation, payment confirmation, driver earnings | **Built** | `srv/transaction`, `srv/booking` |
| 1.9 | Driver wallet, commission deduction (10%), top-up | **Built** | Minimal wallet (slice 1) + `PricingSettings.commissionPercent` per (category × rideType) used by `debitCommissionForCompletedRide` (slice 7, 2026-05-17), falling back to `CommissionSettings.rate`. Admin manual top-up via wallet tab. |
| 1.9 | Hybrid debt limit (-$5), strong visibility, simple top-up | **Built** | `WalletSettings.defaultDebtLimitCents` + per-user override; online toggle gated on `assertAboveDebtLimit` (slice 1) |
| 1.10 | Notifications (driver assigned/arriving/arrived/started/completed/payment) | **Built** | `srv/notification`; FCM via `User.fcm_token` |
| 1.10 | SMS fallback | **Partial** | Twilio service exists but not wired as fallback path |
| 1.11 | Trip history, details, receipts | **Built** | `srv/transaction`; `PaymentReceipt` model with email send |
| 1.12 | Two-way ratings + flag bad behavior | **Built** | `prisma Review`, `srv/rating`, `prisma NoShow` |
| 2.1 | "Passing near you" | **Partial** | D2D matching (`RideRequestMatch`) covers detection; no explicit notification UX for "driver passing nearby" |
| 2.2 | Surge pricing / high-demand alerts | **Cut** (§6) | |
| 2.3 | Masked calling | **Cut** (§6) | Replaced with `tel:` dialer button. **Dialer wired 2026-05-17** on active ride, ride detail (post-booking), ride-request waiting, chauffeur service detail. |
| 2.3 | In-app chat | **Built** | `srv/chat`, mobile chat screens |
| 2.3 | Optional real-number reveal | **Cut** (§6) | Not needed once we expose dialer button |
| 2.4 | Ride scheduling (book later) | **Built** | P2P rides have `departureTime`; `RideRequest.timeWindowStart/End` |
| 2.5 | First-ride discount, promo codes, referrals | **Partial** | Coupon engine + `Referral` model built (`srv/coupon`); first-ride/promo-code engine **Cut**. Mobile coupon UI **deferred 2026-05-17** — existing `Coupon` model is credit/quantity-based (no `code` field), so "enter promo code" needs a redesign to "apply N of M available coupons" UX. |
| 2.6 | Multi-vehicle types (Economy, Premium, Moto) | **Built** (2026-05-17) | `VehicleTier` enum (ECONOMY / PREMIUM) on `Vehicle`. Captured in mobile vehicle/add form + admin VehiclesTab spec column. PricingSettings can branch on tier in a later slice. |
| 3.1 | Ride pooling / shared trips | **Cut** (§6) | Complex routing — pushed |
| 3.2 | Heatmaps for drivers | **Cut** (§6) | No demand analytics surface |
| 3.3 | Fraud detection (fake trips, GPS spoofing) | **Partial** | NoShow workflow only; no spoofing detection |
| 3.4 | SOS, trip sharing, KYC | **Partial** — KYC **Built** (2026-05-17); SOS + trip-share descoped to MVP, still pending |
| 3.5 | Admin dashboard | **Built** | `client/src/pages/admin` with 22 tabs (now incl. Reports, KYC Review, Pricing Settings, Bus Operators / Routes, Driver Wallets, Wallet Settings) |

### 3.2 Car rental marketplace

Source: `docs/client-requests/car-rental.md`

| # | Requirement | Status | Where it lives / what's missing |
|---|---|---|---|
| 1 | Three roles (customer, partner, admin) | **Built** | `User.role`; partner is a regular user with vehicles |
| 2 | Car inventory fields (make, model, year, plate, category, transmission, fuel, capacity, ≥3 images) | **Built** (2026-05-17) | `Transmission` + `FuelType` enums on `Vehicle`. Captured in mobile vehicle/add form; surfaced in admin VehiclesTab spec column. |
| 2 | Car status (Available/Booked/InUse/Maintenance/Disabled) | **Built** (2026-05-17) | `VehicleStatus { AVAILABLE, MAINTENANCE, DISABLED }` on `Vehicle`. Status column in admin VehiclesTab. Owner / admin can flip to MAINTENANCE/DISABLED. |
| 3 | Time-based availability calendar, prevent overlap, hourly + daily | **Partial** | `RentalType { HOURLY, DAILY }` + booking overlap exists. `VehicleBlockedRange` model + admin CRUD endpoints added (2026-05-17). Booking creation rejects overlap with both active rentals AND blocked ranges. **Admin UI panel for blocked ranges deferred** (backend endpoints work via curl). |
| 4 | Customer booking flow (location → dates → browse → confirm → pay) | **Built** | `mobile/app/rental`, `mobile/RentalBookingModal` |
| 4 | Show total / deposit / cancellation policy before confirm | **Partial** | Total + deposit shown; cancellation policy text not standardized |
| 5 | Pricing — per-day required, per-hour optional, long-rental discount, min/max admin rules | **Partial** | `Vehicle.dailyRate`, `hourlyRate`, `securityDeposit` exist; **no long-rental discount or admin price-rule enforcement** |
| 6 | Platform-controlled payment (no direct partner payment), commission, post-trip payout | **Built** | `RentalSettings.platformFeePercentage` (15% default); transaction records partner amount |
| 6 | Mobile money / card / cash | **Same as 1.8** above (cross-cutting) |
| 7 | Security deposit held separately, refund/deduct after condition report | **Partial** | `securityDepositAmount`, `depositRefunded`, `depositTransaction` on `CarRental`; **condition-report flow + photo evidence missing** |
| 8 | Booking lifecycle (Pending/Confirmed/Ongoing/Completed/Cancelled/No-show) + notifications | **Built** | `RentalStatus` enum + `srv/rental` triggers |
| 9 | Pickup/return — capture condition (photos + checklist), fuel level, handover confirmation | **Missing** | No condition-checklist model; no `TRIP_EVIDENCE` asset category |
| 10 | Cancellation rules (24h=100%, 12-24h=80%, <12h=50%); no-show 100%; late-return charge | **Partial → Mostly Built** (2026-05-17) | `RentalSettings` extended with four refund-tier % fields. `computeCancellationRefund()` helper (unit-tested, 8 cases). Rental + chauffeur cancel endpoints now compute + log + return `cancellationPolicy: { tier, refundPercent }` for admin to issue actual refund. Late-return auto-penalty + admin settings UI still pending. |
| 11 | Partner profile, verification, calendar mgmt, earnings dashboard | **Partial** | Partner uses normal driver onboarding; **earnings dashboard missing in admin**; calendar mgmt missing |
| 12 | Partner performance tracking (cancellation rate, ratings, completion) | **Partial** | Reviews captured per rental; no aggregated partner KPIs |
| 13 | Anti-bypass (hide phone until confirmed, in-app messaging only, repeated cancellation flag) | **Partial** | Chat exists; phone-hiding rule not enforced; cancellation-pattern flagging missing |
| 14 | Admin controls (cancel, block car, adjust pricing, penalize, approve damage claims) | **Partial** | `admin/RentalsTab`; damage-claim approval missing because no incident model |
| 15 | Notifications (booking/payment/pickup reminder/return reminder/cancellation) | **Built** | Reminder flags on `CarRental` model |
| 16 | Reporting & analytics | **Partial** | `admin/DashboardTab` exists; rental-specific KPIs missing |

### 3.3 Chauffeur service

Source: `docs/client-requests/chauffeeur-service.md`

| # | Requirement | Status | Where it lives / what's missing |
|---|---|---|---|
| 1 | Service definition (driver-only, customer's car) | **Built** | `prisma ChauffeurService` with optional `vehicleId` |
| 3.1 | Request creation (pickup, destination, type, transmission, special conditions) | **Partial** | `serviceType`, `pickup/dropoff` exist; **transmission preference, drunk/VIP flags missing** |
| 3.2 | Price calculation (base, distance, time, night surcharge, waiting fee) | **Partial** | `totalAmount` set per booking; no settings-driven calculation, no night surcharge |
| 3.3 | Mandatory upfront payment into escrow | **Built** | `transaction` linked to `ChauffeurService` before activation; payouts after completion |
| 3.4 | Driver matching (qualified, not nearest; license/transmission/rating/trips/KYC filters) | **Partial** | Availability + driver list exist; quality filters not enforced |
| 3.5 | Arrival verification (driver name/photo/rating; OTP/PIN; optional face) | **Missing** | No arrival-verification step |
| 3.5 | Optional pre-trip car condition photos | **Missing** | (cross-cutting evidence) |
| 3.6 | Trip execution — GPS tracking, route, share, SOS | **Missing** | (cross-cutting safety) |
| 3.7 | Both-confirm completion → release; dispute → admin hold | **Partial** | `acceptedAt`, `completedAt`, `cancelledAt` exist; explicit dual-confirm + dispute hold missing |
| 4 | Escrow + commission + driver wallet + withdrawal | **Partial** | Escrow + commission built; **wallet missing**; withdrawal **Cut** (§6) |
| 5 | Mandatory verification (national ID, license, selfie, criminal background) + status PENDING→APPROVED→ACTIVE | **Built (MVP)** (2026-05-17) | `kycStatus` on User + Vehicle, admin KycReviewTab queue, gates on online toggle / vehicle creation / ride creation. **National ID, selfie, criminal background descoped** per client direction — admin reviews already-collected license + vehicle docs (yellow card / insurance / authorization). |
| 5.2 | Driver profile (years experience, language, rating, completed trips) | **Built** (2026-05-17) | `drivingExperience` text + new `User.languagesSpoken` JSON array. Chauffeur availability screen has language multi-select chips. Rating + completed trips already live. |
| 6 | SOS, live tracking, share trip, behavior monitoring | **Missing** | (cross-cutting safety) |
| 6 | Insurance/liability terms enforcement | **Missing** | (cross-cutting agreements) |
| Liability §1-2 | Driver agreement (independent contractor, GPS consent, etc.) with version + timestamp + IP | **Partial** | `termsAccepted` boolean; no versioning, no IP, no per-clause consent |
| Customer §3 | Customer risk-disclosure dialog with version log | **Missing** | |
| Evidence §4 | Pre/post trip photo capture (4 angles), GPS+timestamp metadata | **Missing** | |
| Incident §5 | Incident reporting with auto-attached trip data | **Missing** | |
| Payment Protection §6 | Escrow conditional release on incident | **Partial** | Escrow exists; incident-aware hold not wired |
| §7 | Driver risk scoring + automated suspension thresholds | **Partial** | Suspension fields exist on `User`; no automated trigger |
| §8 | Trip monitoring (route deviation, long stops, speed) | **Missing** | Requires GPS trail storage |
| §9 | Real-time tracking ON during trip, undisableable | **Missing** | |
| §10 | Admin: view trips/routes, evidence, freeze payments, ban, export | **Partial** | Most admin actions exist; evidence + freeze payments + export missing |
| Cancellation §1-3 | State-aware cancellation rules (free / fee / penalty / blocked) | **Partial → Mostly Built** (2026-05-17) | Time-based tier engine via `ChauffeurSettings` (24h/12h/no-show %). State-aware nuance (REQUESTED grace, DRIVER_ARRIVED 50%, ACTIVE-cannot-cancel) still pending — current implementation is time-window only. |
| Auto-cancel §4 | Driver doesn't move 5min, missed ETA → auto-cancel + refund + driver penalty | **Missing** | |
| No-show §1-6 | GPS-proven arrival, 5min free wait, paid wait, customer no-show, abuse prevention | **Partial** | NoShow model exists; GPS proof + paid waiting missing |
| §9 platform features | Scheduled bookings, favorite drivers, "stay with me", multi-stop | **Partial** | Scheduled is implicit via `startDate`; favorites/stay-with-me/multi-stop missing |

### 3.4 Bus ticketing

Source: `docs/client-requests/bus-ticketing.md`

**Approach update (2026-04-18):** The bus module is being built on top of the existing `Ride` / `Booking` / `BookingSeat` machinery, not as a parallel module. A bus trip = a `Ride` with `vehicle.category = BUS` and `routeId` → `BusRoute`. Passenger booking, seat attendance, notifications, and settlement reuse existing code. See `docs/superpowers/specs/2026-04-18-buses-and-wallet-foundation-design.md` (slice 1) and `docs/superpowers/tracking/implementation-status.md`.

Rows below reflect the original breakdown from the client request. Statuses are updated where slice 1 covers them; items not covered by slice 1 remain **Missing / Deferred** for later slices.

| # | Requirement | Status |
|---|---|---|
| 2.1 | Mobile money payment (MTN/Airtel) with seat lock + ticket-only-on-confirmation + reconciliation | **Deferred** — depends on gateway abstraction + MoMo adapter (tracker slices 4, 10). Slice 1 uses OFF_PLATFORM cash. |
| 2.2 | Ticketing + signed QR + multi-channel delivery (in-app/SMS/printable) | **Partial (slice 1 covers in-app QR)** — in-app ticket with QR (plain attendance code, not signed) in slice 1. SMS delivery and printable format deferred with agent flow. Signed QR **Cut** — see decisions log §6. |
| 2.3 | Scanner app with online + offline validation, anti-double-scan | **Changed scope** — slice 1 uses a bus-driver manifest screen with QR-scan FAB, online-only, server-side anti-double-scan via `BookingSeat.attendedAt`. Offline validation **Cut**. |
| 2.4 | Real-time tracking, bus status, operator dashboard | **Deferred** — existing ride-status machinery covers trip status; operator-facing dashboard deferred. |
| 2.5 | Seat management with lock + auto-release | **Covered by slice 1** — reuses `BookingSeat` with `lockedUntil`; verify field exists or add during implementation. |
| 2.6 | Intercity routes, multiple boarding points, agent role with cash + print | **Split** — routes + multiple boarding points covered by slice 1 (`BusRoute` + `BusRouteStop`, `Booking.boardingStopId`/`alightingStopId`). Agent cash + print deferred (tracker slice 8). |
| 2.7 | SMS booking flow + USSD menu | **Deferred** — tracker slice 9; depends on gateway work. |
| 2.8 | Phone+OTP auth (reuse existing); roles (Customer/Agent/Driver/Admin) | **Partial** — slice 1 adds `BUS_OPERATOR` role; bus driver is any `User` assigned as `Ride.driverId`. `AGENT` role deferred with agent flow (tracker slice 8). |
| 3.1 | Cancellation + refund rules | **Deferred** — cash trips have no platform-held funds to refund; tiered-refund rules revisit when gateway/MoMo lands. |
| 3.2 | Daily reconciliation (paid vs ticketed) | **Deferred** — tracker slice 12; only meaningful once platform holds funds. |
| 3.3 | Agent management + commission tracking | **Deferred** — tracker slice 8. |
| 3.4 | Fraud prevention (duplicate QR, fake confirmations, agent misuse) | **Partial (slice 1)** — duplicate-scan blocked via `BookingSeat.attendedAt` check; fake-confirmation + agent-misuse deferred with gateway/agent work. |
| 3.5 | Network failure strategy (offline QR, retry, caching) | **Cut** — offline QR validation rejected for MVP; manifest is pre-fetched at trip start so driver can mark boarded after the fact. |
| 4 | Bus-ticketing admin dashboard | **Partial (slice 1)** — `BusOperatorsTab`, `BusRoutesTab` in slice 1. Agent/reconciliation/fraud tabs deferred. |
| 7 | Passing-near-you for buses | **Cut** (§6) — N/A for fixed routes |

### 3.5 Growth / nice-to-have

Cross-references items called out across all source docs.

| Requirement | Status | Note |
|---|---|---|
| Surge pricing | **Cut** | §6 |
| Heatmaps | **Cut** | §6 |
| Ride pooling / shared trips | **Cut** | §6 |
| GPS spoofing detection | **Cut** | §6 — out of MVP |
| First-ride / promo-code engine | **Cut** | §6 — handled via admin-issued coupons |
| Referral system | **Built** | `prisma Referral`, `User.referralCode` |
| Multi-vehicle tiers (Economy / Premium) | **Built** (2026-05-17) | `VehicleTier` enum on `Vehicle`; pickable in mobile add-vehicle form. |
| Subscriptions (driver/passenger) | **Built** | `prisma SubscriptionPlan`, `UserSubscription` |

### 3.6 Safety & risk (cross-cutting summary)

| Item | Status |
|---|---|
| SOS button + emergency contact alert | **Descoped to MVP** (2026-05-17) — partially covered by trip-Report flow; dedicated SOS + emergency-contact SMS still pending |
| Live trip-share link (recipient sees real-time location) | **Cut** (2026-05-17) — chat covers the safety-coord case |
| GPS trail storage during active trip | **Descoped to MVP** (2026-05-17) — `TripGpsPoint` model not built; no admin live map |
| Pre/post trip photo evidence with GPS+timestamp | **Partial** — `TRIP_EVIDENCE` AssetCategory added 2026-05-17; capture UI pending |
| Background check status (PENDING→APPROVED→ACTIVE gate) | **Built (admin manual)** (2026-05-17) — `kycStatus` gate works; vendor integration (Smile / Trulioo) **Cut** per 2026-05-17 |
| Versioned driver agreement (timestamp + IP + device) | **Partial** — still pending; `AgreementVersion` model not yet built |
| Versioned customer risk-disclosure | **Cut** (2026-05-17) — existing terms acceptance covers liability |
| Incident reporting model + admin resolution | **Partial → Built (MVP)** (2026-05-17) — `RideReport` polymorphic model + admin ReportsTab + Mark Reviewed / Dismiss flow. Full `Incident` w/ type taxonomy + resolution decisions reserved for if a real claim pipeline appears. |
| Route-deviation / speed / long-stop detection | **Cut** (2026-05-17) — re-evaluate post-launch once GPS trail volume exists |

### 3.7 Admin dashboard

| Area | Status | Tab |
|---|---|---|
| Users | **Built** | `UsersTab` |
| Vehicles | **Built** | `VehiclesTab` |
| Rides | **Built** | `RidesTab` |
| Ride requests | **Built** | `RideRequestsTab` |
| Bookings | **Built** | `BookingsTab` |
| Transactions | **Built** | `TransactionsTab` |
| Rentals | **Built** | `RentalsTab` |
| Chauffeur | **Built** | `ChauffeurTab` |
| No-shows | **Built** | `NoShowsTab` |
| Coupon redemption rules | **Built** | `CouponRedemptionRulesTab` |
| Commission settings | **Built** | `CommissionSettingsTab` |
| D2D settings | **Built** | `D2DSettingsTab` |
| Fee settings | **Built** | `FeeSettingsTab` |
| Tax rates / taxes | **Built** (Canadian model — needs swap) | `TaxRatesTab`, `TaxesTab` |
| Contact messages | **Built** | `ContactMessagesTab` |
| Logs | **Built** | `LogsTab` |
| **Driver wallets** (manual top-up) | **Built** | `DriverWalletsTab` (slice 1) |
| **Payment gateways** (enable/disable) | **Deferred** | Gateway abstraction cut from current scope (M3) |
| **Pricing settings** (base/per-km/per-min) | **Built** (2026-05-17) | `PricingSettingsTab` |
| **KYC review** (background check approve/reject) | **Built** (2026-05-17) | `KycReviewTab` with combined drivers + vehicles queue |
| **Incidents** (review + resolve) | **Built (MVP)** (2026-05-17) | `ReportsTab` covers basic incident-as-flag; full Incident UI deferred |
| **Bus operators / routes / trips** (M2) | **Partial** | `BusOperatorsTab`, `BusRoutesTab` (slice 1); BusTrips view deferred |
| **Bus agents** (M2) | **Deferred** | Tracker slice 8 |
| **Bus ticketing reconciliation** (M2) | **Deferred** | Tracker slice 12 |
| **Trip reports** (driver/passenger flag review) | **Built** (2026-05-17) | `ReportsTab` + red-row highlight on Rides/Chauffeur/Rentals |
| **Cancellation policy settings** | **Partial** | Backend fields on RentalSettings + ChauffeurSettings (2026-05-17); admin form UI deferred |
| **Vehicle blocked ranges** | **Partial** | Backend admin CRUD endpoints (2026-05-17); admin UI panel deferred |

---

## 4. Built — retained as-is (no work this round)

These are flagged so the client knows we kept them and can challenge if anything looks wrong.

- Email/password auth + email verification (used alongside phone+OTP)
- Subscriptions (passenger/driver, monthly/quarterly/yearly)
- Coupon engine + redemption rules + referral records (mobile entry UX is the only addition needed — see §3.1 row 2.5)
- P2P (driver-posted) rides alongside D2D (on-demand) rides
- French translations alongside English
- Stripe Connect onboarding for drivers (will be retired or repurposed during gateway-abstraction work)
- PayPal adapter (kept as second proof point that gateway abstraction works)
- Apple/Google sign-in **was removed** (commit `c953dee`) — confirm with client this is intentional

---

## 5. Out-of-scope items in current code

These exist in the schema/code but the client never asked for them. Calling them out so we can decide whether to keep, hide, or remove:

- **Canadian tax model** (`TaxRate`, `Tax`, `ProvinceCodes`) — being replaced by Rwanda VAT
- **CAD currency defaults** — being replaced by RWF defaults
- **`MonetizationType` analytics field** on `Ride`/`Booking` — useful, keep
- **`ContributionCollectionMethod` (`VIA_PLATFORM`/`OFF_PLATFORM`)** — relevant for P2P but not for D2D; verify client wants both modes

---

## 6. Decisions log (Cut / Changed)

Record of items the client originally asked for but that we are not building, with rationale. Each is challengeable but we have a recommendation.

| # | Item | Decision | Rationale |
|---|---|---|---|
| 1 | In-app voice calls (masked or otherwise) | **Cut** — replace with `tel:` dialer button on detail screens | In-app calling requires a telephony provider per market, masking infra, and a separate carrier license. Dialer button costs zero, ships immediately. Chat covers the silent-comms case. |
| 2 | Real mobile-money payments (MTN MoMo, Airtel Money) | **Deferred to M3** behind a gateway abstraction; **MVP gateway = `MANUAL` admin credit** to driver wallet | Cleaner to land the wallet + ledger first, then plug live gateways. Likely DPO Group as initial RW gateway. |
| 3 | Driver wallet withdrawal | **Permanently disabled** — no withdrawal endpoint, no admin "send to driver" action | Anti-money-laundering posture for Rwanda regulator (BNR). Mirrors inDrive model. Driver tops up to operate; system charges per ride. |
| 4 | Cash payments | **Cut** | Cash bypasses commission collection. Wallet model assumes pre-funded driver. |
| 5 | First-ride discount + promo-code engine | **Cut as a system feature**; promotions run as off-system campaigns issuing `Coupon` records | Existing coupon engine is enough — admin issues coupons for any campaign. No need for code-redemption flow beyond UI to enter a coupon code. |
| 6 | Surge / dynamic pricing | **Cut** | Requires demand-supply observability + real-time pricing engine. Out of MVP. |
| 7 | Ride pooling / shared trips | **Cut** | Complex multi-stop routing. Re-evaluate post-launch. |
| 8 | Heatmaps | **Cut** | Driver-facing demand viz needs aggregated trip data + map overlay. Defer. |
| 9 | GPS spoofing detection | **Cut** | Heuristic detection + appeals flow is its own project. |
| 10 | "Passing near you" as a separate notification | **Reduced** — D2D matching already does proximity matching; no extra "driver passing nearby" push | Re-add only if drivers complain about missed opportunities. |
| 11 | Apple / Google sign-in | **Cut** (already removed in commit `c953dee`) | Reduces auth surface area. Confirm with client. |
| 12 | Bus passing-near-you | **Cut** | Buses run fixed routes; concept doesn't apply. |
| 13 | Stripe / PayPal as live RW payment methods | **Cut** | Stripe not available in Rwanda. Adapters retained as code references. |
| 14 | Signed / cryptographic QR on bus tickets | **Cut** (2026-04-18) | QR encodes plain `BookingSeat.attendanceCode`; server is source of truth for double-scan prevention. Signed payload + public-key distribution bought nothing in the MVP because scanning is online-only anyway. See `2026-04-18-buses-and-wallet-foundation-design.md` §10. |
| 15 | Offline scanner validation for bus tickets | **Cut** (2026-04-18) | Manifest is pre-fetched at trip start; driver can mark boarded after the fact if data drops. Reverse the decision only if real-world operator feedback requires it. |
| 16 | Parallel `BusTrip`/`BusSeat`/`BusTicket` schema (per original consolidated reqs §5.2) | **Changed** (2026-04-18) | Replaced with "buses ride on rides" approach. Only `BusRoute` + `BusRouteStop` are new tables. See slice 1 spec §3. |
| 17 | Bus-ticketing reconciliation-as-separate-system | **Deferred** (2026-04-18) | Cash OFF_PLATFORM trips have no platform-held funds to reconcile against. Revisit when MoMo/gateway lands and platform starts holding bus funds. |
| 18 | KYC: National ID + selfie + background-check vendor (Smile / Trulioo) | **Cut** (2026-05-17) | Client-supplied spec was ChatGPT-overstated. MVP = admin reviews already-collected driver's license + vehicle docs (yellow card / insurance / authorization). Vendor integration deferred indefinitely. |
| 19 | Live trip-share public link | **Cut** (2026-05-17) | Chat covers the safety-coord case; auth-less public webhook adds attack surface for little user benefit. |
| 20 | Customer risk-disclosure versioned dialog | **Cut** (2026-05-17) | Existing terms acceptance covers liability; no separate versioned-dialog need. |
| 21 | Route deviation / speed / long-stop detection | **Cut** (2026-05-17) | No GPS volume yet; re-evaluate post-launch once `TripGpsPoint` records exist. |
| 22 | Driver risk scoring nightly job | **Cut** (2026-05-17) | Admin can suspend manually via UsersTab; automated thresholds = false-positive risk for low data volume. |
| 23 | Full `Incident` model with type taxonomy + resolution decisions | **Reduced** (2026-05-17) | Single `RideReport` polymorphic model + admin Reports tab covers MVP "flag a trip, admin reviews". Full Incident model reserved for if/when a real claim pipeline is needed. |
| 24 | Mobile coupon-code entry UI | **Deferred** (2026-05-17) | Existing `Coupon` model is credit-based (`quantity` per user, no `code` field). Needs a UX redesign to "apply N of M available coupons" before implementation. |
| 25 | Email notifications | **Disabled** (existing) | `server/src/config/email.ts` is a no-op shim; admin sees trip-reports via FCM in-app instead. Re-enabling email is its own slice. |
| 26 | New `CancellationPolicy` table | **Cut** (2026-05-17) | Added four refund-tier % fields directly to `RentalSettings` + `ChauffeurSettings` instead of a new table; admin tunes via existing settings rows. |
| 27 | New `Wallet` / `WalletLedger` / `WalletTopupRequest` tables | **Still deferred** (slice 11) | Minimal wallet (column + Transaction ledger) covers MVP. Upgrade path on file. |

---

## 7. Cross-references to source docs

- `docs/client-requests/core-ride-hailing.md` → §3.1
- `docs/client-requests/car-rental.md` → §3.2
- `docs/client-requests/chauffeeur-service.md` → §3.3 (includes liability + cancellation specs)
- `docs/client-requests/bus-ticketing.md` → §3.4 (entire M2)

---

## 8. Session log

### 8.1 Session 2026-05-17

**Branch:** `feat/trip-reports` (18+ commits ahead of `main`)

**Major slices shipped:**

| Slice | Status | Key artefacts |
|---|---|---|
| Trip-report MVP (§3.9 reduced) | Shipped | `RideReport` model w/ polymorphic FK to Ride / ChauffeurService / CarRental. Admin `ReportsTab` + red-row highlight on Rides / Chauffeur / Rentals tabs. Mobile Report button on active ride + chauffeur service detail. Contextual ("Report driver" vs "Report passenger"). |
| KYC approval workflow (§3.5 / §3.3.5) | Shipped (MVP) | `KycStatus` enum on User + Vehicle. Admin `KycReviewTab` queue (drivers + vehicles). Server gates on online toggle, vehicle creation, ride creation. Vehicle docs (yellow card / insurance / authorization) captured in mobile vehicle/add. Existing seeded drivers + vehicles backfilled APPROVED so dev keeps working. **National ID + selfie + background-check vendor descoped per client.** |
| Pricing settings (§3.1 row 1.7) | Shipped | `PricingSettings` per (vehicleCategory × rideType) w/ baseFare/perKm/perMin/min + `commissionPercent`. Public `/fare-estimate` endpoint. Mobile ride-request pre-fills `proposedFare` via haversine distance estimate. Admin `PricingSettingsTab` CRUD. Commission deduction (`debitCommissionForCompletedRide`) now reads PricingSettings.commissionPercent with CommissionSettings fallback. |
| Tier 1 vehicle metadata + Tier 2 cancellation | Shipped | Vehicle: `transmission`, `fuelType`, `status`, `tier` enums. `VehicleBlockedRange` model + admin CRUD + booking-overlap rejection. User: `languagesSpoken` JSON array w/ mobile chauffeur availability multi-select. AssetCategory: `TRIP_EVIDENCE` (prep). RentalSettings + ChauffeurSettings: four cancellation refund-tier % fields. `computeCancellationRefund()` helper applied on rental + chauffeur cancel paths. Admin `POST /admin/users` for role-aware creation (plugs slice-1 follow-up). |
| Mobile dialer wiring (§3.4) | Shipped | `tel:` Call buttons on ride detail (post-booking), chauffeur service detail; already on active ride + ride-request waiting. |

**Pre-existing critical bugs fixed during testing:**

1. **Live driver map** — `/drivers/nearby` had been 500-ing since shipped because the `swLat`/`swLng`/`neLat`/`neLng` validator never cast to float; Prisma rejected the string-typed bounds. (`server/src/middlewares/validators/driverPresence.validator.ts`)
2. **Ride-request waiting screen perma-loading** — read `request.rides[0].id` but API returns `matches[].ride.id`; also double-unwrapped `.data` on `useRideDetail` which already unwraps via `select`. (`mobile/src/app/ride-request/[id].tsx`)
3. **End ride had no UI** — backend `PUT /rides/:id/complete` existed, mobile never called it. Added driver-only End ride button + 5s polling + auto-route passenger to rating screen on completion. (`mobile/src/app/ride/[id]/active.tsx`)
4. **Submit review payload mismatch** — mobile sent `revieweeId` / `comment`; server expects `driverId` / `review`. `ride.driverId` wasn't a top-level field on the mobile Ride type, so the request always 400'd. (`mobile/src/app/ride/[id]/complete.tsx`, `mobile/src/hooks/useRides.ts`)
5. **Post-completion driver flow** — added "Find ride requests" CTA on ride detail after COMPLETED so driver can pick up the next fare.

**Decisions made this session** (also folded into §6 Decisions log):

- Email infrastructure stays disabled — `config/email.ts` is a no-op shim; all notifications use FCM. Re-enabling email is its own slice (#25 in §6).
- Driver KYC scope = admin reviews already-collected license; vendor integration (Smile / Trulioo) **Cut** (#18). Vehicle KYC = yellow card + photos + insurance + authorization, all 4 collected at vehicle creation.
- Backend gates: online toggle, vehicle creation, ride creation all 403 unless the relevant `kycStatus === APPROVED`.
- Existing onboarded drivers + admins + their vehicles backfilled to APPROVED in migration so live dev/test data keeps working.
- Cancellation refund: log + return in response, admin issues actual refund manually. Avoids gateway-integration dependency. No new `CancellationPolicy` table — added fields to existing settings rows (#26).
- Single `RideReport` polymorphic model serves as MVP-level "incident reporting" (#23). Full `Incident` + type taxonomy + resolution decisions reserved.
- Mobile coupon-code UI deferred — existing model is credit-based, not promo-code based (#24).
- Live trip-share public link **Cut** (#19) — chat covers it.
- Customer risk-disclosure dialog **Cut** (#20) — existing terms acceptance covers liability.
- Route deviation / speed / long-stop detection **Cut** (#21) — no GPS volume yet; revisit post-launch.
- Driver risk scoring **Cut** (#22) — admin can suspend manually.
- Full SOS button + emergency-contact SMS + live admin map = **descoped to MVP**; Reports flow partially covers it. Build dedicated SOS only if the test fleet reports a genuine safety incident pattern.

### 8.2 What remains to close Phase 2

Ranked by what would move the dial fastest, MVP-pragmatic:

**Small, fast (under half a day each):**
- Admin polish UI: BlockedRange panel on VehiclesTab, cancellation-tier inputs on existing settings tabs, "Create user" dialog on UsersTab. Backend supports it all already.
- Mobile rental booking detail screen (post-booking) — so the Report button + Call button can land there too; rentalId is already a target on `RideReport`.
- Mobile coupon UI redesign for the credit-based Coupon model ("apply N of M available coupons").

**Medium (~half day each):**
- Versioned driver agreement (`AgreementVersion` + `UserAgreementAcceptance` models + admin publish UI). MVP-easy; legally useful.
- Pre/post trip photo evidence capture flow on chauffeur + rental (TRIP_EVIDENCE category already in enum; needs mobile UI + admin gallery).
- Late-return auto-penalty for rentals.
- Chauffeur arrival verification (4-digit PIN — no QR).

**Larger (~1+ day each):**
- SOS button + emergency-contact SMS + admin live map. Even MVP is non-trivial.
- GPS trail (`TripGpsPoint` model + 30s mobile heartbeat + admin map view).
- Quality-first chauffeur matching filter (rating >= 4.0, completedTrips >= 5) — small change but needs settings + UX consideration.

**Explicitly deferred (M3 — not needed to close Phase 2):**
- Payment gateway abstraction (DPO / MoMo / Airtel) — user deferred 2026-05-17.
- Full `Wallet` / `WalletLedger` / `WalletTopupRequest` tables.
- Reconciliation + fraud dashboards.
- Bus agent + SMS/USSD booking.

### 8.3 Completion estimate

By weighted effort against contract scope, with the cuts in §6 (entries 18–26) holding (no gateway, no vendor KYC, MVP-level safety, descoped Incident, deferred coupon entry) and the §9 intended-flow alignment closed (2026-06-02): **~100% of contract scope**.

The §9 closure (Guest browse + just-in-time auth) removed the remaining ~1% of contract scope. What's left is now only the small/medium items in §8.2 (admin polish UI, mobile rental detail screen, mobile coupon UX redesign, versioned driver agreement, pre/post photo evidence, chauffeur PIN, late-return penalty) and items already flagged Open / Cut / Out-of-scope in §9 (§9.6 rental two-step strictness — Partial; §9.5 cooperative-driver schema split — Open; §9.7 live bus GPS — Cut for MVP; §9.8 motor-tax vertical — Out of scope). None of those is residual contract scope.

The big net-new piece shipped in this window — counter-offer bidding (§10) — is not a contract-scope item but a fundamental change to the matching model.

---

## 9. Client intended flow (2026-05-08)

**Source documents:**
- `docs/superpowers/specs/2026-05-08-client-intended-flow.md` — cleaned-up reading + per-role KYC table + open questions
- `docs/superpowers/specs/2026-05-08-client-intended-flow.html` + `.png` — browser-renderable diagrams

The client confirmed two structural rules: (a) the app is browseable without an account; signup is just-in-time at the moment a gated action is attempted. (b) Post-signup, the user lands on a home that reflects their role.

| Item | Status | Notes |
|---|---|---|
| Public browse / no auth gate | **Built** (2026-06-02) | `mobile/src/app/(drawer)/_layout.tsx` no longer hard-redirects unauthenticated users (the prior `if (!isAuthenticated) return <Redirect ... />` was removed). Backend: five new public controllers under `server/src/controllers/public/` (rides, rentals, chauffeur, buses, vehicles) backed by shared services under `server/src/services/search/`. |
| First-launch "Register now or Skip" splash | **Built** (2026-06-02) | `mobile/src/app/(auth)/welcome.tsx` now includes a "Continue as guest" CTA alongside Login + Sign Up. `authStorage.hasSeenWelcome` (in `mobile/src/services/auth.ts`) records first-launch state; first-launch redirect lives in `mobile/src/app/_layout.tsx`. |
| Just-in-time auth prompts at gated CTAs | **Built** (2026-06-02) | `mobile/src/providers/AuthGateProvider.tsx` + `mobile/src/components/AuthGateSheet.tsx` + `mobile/src/hooks/useRequireAuth.ts` provide the gate. ~25 callsite wraps across DriverHome, CounterOfferSheet, rental detail, chauffeur detail, ride detail, vehicle add/edit, chat, profile, etc. |
| Role-aware post-register home | **Built (mode-toggle variant)** | `ModeProvider` (`mobile/src/providers/ModeProvider.tsx`) routes the (drawer) home to `DriverHome` or `PassengerHome` based on `user.isDriverOnboarded` + persisted preference. The client's diagram showed redirect-to-role-home; the mode toggle is functionally equivalent, reversible, and works for users who play both roles. |
| Driver-only (cooperative-employed) schema split | **Open — confirm with client** | Schema assumes `Vehicle.userId` is the driver. Distinct modelling for cooperative-owned vehicles + employed drivers is not yet built. |
| Rental two-step (request → company approve → contact reveal → fee → contract) | **Partial** | Request → owner approve → renter pay → owner activate already exists. The strict "teaser-only until approve" + "contact-reveal gate" + "fee-before-contract" specifics are not enforced; phone is hidden by chat-only policy in practice. |
| Live GPS during bus trip | **Cut (MVP)** | Descoped per 2026-05-17 decisions (#19, #21). Revisit post-launch once trip volume justifies a `TripGpsPoint` model. |
| Motor / Car Tax vertical (RURA + cooperative + tax docs) | **Out of scope** | Net-new vertical from client's diagram; no schema, no UI. Re-evaluate as a separate engagement. |

**The slice to close this:** shipped as the "Guest browse + just-in-time auth" slice on 2026-06-02 (rows 1–3 above flipped to Built). See `2026-06-02-guest-browse-and-just-in-time-auth-design.md` + `2026-06-02-guest-browse-and-just-in-time-auth.md`.

---

## 10. Net-new features since gap-analysis was written

These shipped in the ~109-commit window after the original gap-analysis was authored. Not represented in the §3 row tables; documented here so the next reader knows what's in the app beyond contract scope.

| Feature | Where | What it is |
|---|---|---|
| **Counter-offer bidding (inDrive-style)** | `server/src/services/bid.service.ts`, `server/src/controllers/bid.controller.ts`, `server/src/routes/bid.routes.ts`; `mobile/src/hooks/useBids.ts`, `mobile/src/components/CounterOfferSheet.tsx`. Schema: `RideBid` model, `RideBidStatus` enum (`PENDING/ACCEPTED/DECLINED/EXPIRED`), `RideRequest.proposedFare`, `RideRequestStatus.CLOSED`, `User.lastBidPushAt` | Passenger sets a `proposedFare`; N drivers submit bids (accept-at-offered or counter-offer with custom amount); passenger sees the bid list; accepting one atomically creates Ride + Booking and marks all others DECLINED. KYC-gated on driver + vehicle. Debounced FCM push to passenger (10s window). Supersedes the original "nearest-driver auto-dispatch" model in §3.1 row 1.4. |
| **DriverHome (inDrive-style request queue)** | `mobile/src/app/(drawer)/_components/DriverHome.tsx`, `FocusedRideRequestSheet.tsx`, `CountdownRing.tsx`, backlog chip/sheet, `VehiclePickerSheet.tsx` | Map-first driver landing replacing the old ride-requests list screen. GO ONLINE toggle gated on KYC + wallet debt limit + vehicle ownership. Incoming request focuses as a bottom sheet with 20s countdown; Skip moves to backlog, Accept calls `acceptRideRequest`, Counter-offer opens CounterOfferSheet. Backlog row → focus reopens the request. |
| **Driver / passenger mode toggle** | `mobile/src/providers/ModeProvider.tsx`, drawer footer toggle, mode-branching `(drawer)/index.tsx` | Persists driver-vs-passenger UI preference per device. Same account, two contexts, no re-auth. Non-onboarded users clamped to passenger. Closes the §9 "role-aware home" row functionally. |
| **Mobile UI primitive expansion** | `mobile/src/components/ui/{Badge,BottomNav,Card,Input,LocationDot,ScreenHeader,SectionHeading,SheetHandle,Text,VehiclePill}.tsx` + Jest tests | Standardized components used by DriverHome, counter-offer sheet, and across the app. |
| **Theme provider + dark mode** | `mobile/src/providers/ThemeProvider.tsx`, `mobile/src/lib/mapStyleDark.ts` | Light / dark / system preference, persisted. Dark map style on home screens; fixed dark-mode visibility bugs on bottom-sheet controls and location picker. |
| **SES password reset** | Spec `docs/superpowers/specs/2026-05-31-ses-password-reset-design.md`; server `config/email` + reset flow | Email-driven password reset via AWS SES — the one notification flow that re-enables email infra (per decisions log #25 the rest stays disabled). |
| **DrawerControlProvider** | `mobile/src/providers/DrawerControlProvider.tsx` | Imperative drawer open from nested screens (used by ScreenHeader). |
