# Mobile E2E Testing — Maestro on Android

**Date:** 2026-05-07
**Status:** Approved (architecture)
**Scope:** Phase 1 — passenger and driver happy paths, Android emulator only

## Goal

Stand up an automated end-to-end test harness that drives the Expo mobile app on an Android emulator through real user flows, against a dedicated test backend with seeded data. Phase 1 covers passenger and driver happy paths; later phases extend to chauffeur, rental, and edge cases.

Admin-side and pure business-logic verification is out of scope for this harness — those are tested directly via the server's HTTP/socket API (Jest already wired in `server`).

## Architecture

```
┌──────────────────────────┐         ┌─────────────────────────┐
│  Maestro CLI (host)      │ drives  │  Android Emulator(s)    │
│  YAML flows in           │────────▶│  Expo dev/preview build │
│  mobile/.maestro/        │         │  pointed at TEST API    │
└────────────┬─────────────┘         └────────────┬────────────┘
             │ runScript / curl                   │ HTTPS / WS
             │                                    ▼
             │                          ┌─────────────────────┐
             └─────────────────────────▶│  server (test env)  │
                                        │  + Postgres test DB │
                                        │  + /api/test/*      │
                                        │  + test-seed        │
                                        └─────────────────────┘
```

- **Runner:** Maestro CLI, run locally. Maestro Cloud documented for later CI.
- **App under test:** Expo Android dev build (`eas build --profile preview --platform android`) installed on emulator. New `app.config.ts` env profile points API base URL at the test server.
- **Backend:** isolated test instance of `server` with its own Postgres DB. Both spun up via existing `docker-compose.yml` with a `test` profile override.
- **Multi-role coordination strategy:** API-puppeted second role by default. The flow under test runs in the UI; the partner role's actions (e.g. driver accepting, passenger paying) are performed by a `runScript` step calling the server API. Two-emulator runs reserved for flows where both UIs are the asset under test (chat, real-time map updates).

## Components

### 1. Server test endpoints (`server/src/routes/test.routes.ts`)

A new router mounted at `/api/test/*`, only when `NODE_ENV !== "production"` AND a `TEST_AUTH_TOKEN` env is set. All endpoints require an `x-test-token` header matching that env.

- `GET  /api/test/otp?phone=<e164>` → returns the latest `verificationCode` and `phoneVerificationCode` for the user identified by phone (or email). Used to advance OTP screens without real SMS.
- `POST /api/test/reset` → truncates non-system tables and re-runs the test seed. Returns the seeded fixture IDs/credentials so flows can reference them deterministically.
- `POST /api/test/users/:id/verify` → marks a user verified and onboarded in one shot (skip-step for flows where onboarding isn't the asset under test).
- `POST /api/test/rides/:id/accept` → driver-side puppet: accepts a ride request as the seeded test driver.
- `POST /api/test/rides/:id/advance` → advances ride state machine to a target status (driver puppet for `STARTED`, `COMPLETED`, etc.).

Each endpoint returns 404 if the gating env is not set, so a misconfigured production cannot accidentally expose them.

### 2. Test seed (`server/prisma/test-seed.ts`)

Idempotent seeding: deletes E2E test users (matched by `e2e+*@yourdrive.test`) then recreates a known fixture set:

- 2 passengers (`passenger.alice`, `passenger.bob`) — verified, onboarded, with phone numbers `+250788000001`, `+250788000002`.
- 2 drivers (`driver.dan`, `driver.dora`) — verified, onboarded, with one approved vehicle each.
- Baseline ride routes, vehicle types, wallet settings — only what flows actually need.
- A control user `register.target` with no account, used to test register/verify/onboarding from scratch.

All test users share password `E2eTest!2026`. Phone numbers use the `+250788000xxx` block to make filtering trivial.

### 3. Maestro flows (`mobile/.maestro/`)

Directory layout:

```
mobile/.maestro/
  config.yaml                # global: env, includeTags
  flows/
    smoke.yaml               # launches app, asserts welcome screen
    auth/
      register.yaml          # register → OTP → onboarding → home
      login.yaml             # login → home
    passenger/
      request-ride.yaml      # search → request → driver-accepts (puppet) → active → complete → rate
    driver/
      accept-ride.yaml       # passenger-requests (puppet) → driver sees → accepts → active → complete
  helpers/
    reset.yaml               # POST /api/test/reset, store fixture data in env
    fetch-otp.yaml           # GET /api/test/otp, store as ${OTP}
    login-as.yaml            # parameterised login subflow
  README.md
```

Patterns:

- Every Phase 1 flow starts by running `helpers/reset.yaml` so suites are order-independent.
- OTP screens advance via `runFlow: helpers/fetch-otp.yaml` then `inputText: ${OTP}`.
- API puppet steps use `runScript` with a `curl` against `/api/test/*` endpoints.
- Mock GPS set via Maestro's `setLocation` for ride start/end coordinates.

### 4. Mobile testIDs

Phase 1 flows need stable selectors. Add `testID` props to:

- Auth screens: phone input, password input, submit, OTP input, resend link.
- Onboarding: role-pick buttons, continue button.
- Home (drawer index): "Request a ride" CTA, "Post a ride" CTA, drawer toggle.
- Search results: ride list item (param testID with `ride-card-${id}`), select button.
- Active ride: status banner, "Cancel" button, "Complete" button (driver), "Rate" button (passenger).
- Wallet: balance, "Add funds" CTA.

A naming convention doc lives in `mobile/.maestro/README.md` (`testID="screen.element"`, e.g. `auth.phoneInput`).

### 5. Environment & build

- `mobile/.env.test` — `EXPO_PUBLIC_API_URL` points at `http://10.0.2.2:3000` (emulator's host loopback).
- `app.config.ts` reads `APP_VARIANT=test` to pick a different bundle ID (so test build can sit alongside dev/prod on the same emulator).
- `eas.json` gets a `preview-test` profile producing an installable APK.

## Data flow — sample passenger happy path

```
1. Maestro: reset → seed → store passenger.alice creds in env
2. Maestro: launch app, login as passenger.alice
3. Maestro: tap "Request a ride", set pickup/destination via testID inputs
4. Maestro: setLocation to seeded pickup coords
5. Maestro: tap "Confirm request" → assert "Looking for driver" banner
6. Maestro: runScript → POST /api/test/rides/:id/accept (driver.dan puppet)
7. Maestro: assert "Driver assigned" banner appears (server pushes via socket)
8. Maestro: runScript → POST /api/test/rides/:id/advance?status=STARTED
9. Maestro: assert "Ride in progress" banner
10. Maestro: runScript → POST /api/test/rides/:id/advance?status=COMPLETED
11. Maestro: assert "Rate your driver" sheet appears
12. Maestro: tap 5 stars → submit → assert "Thanks for rating"
13. Maestro: navigate to wallet/transactions → assert ride appears
```

## Error handling

- Maestro flows are idempotent via the leading reset step; a failed run leaves no shared state.
- Server test endpoints return 404 when gating env is absent — makes accidental prod exposure inert.
- Per-flow timeout in `config.yaml` to fail fast on socket/network hangs.
- Screenshots and view hierarchy dumps captured on failure (Maestro default).

## Testing

- `mobile/.maestro/flows/smoke.yaml` — sanity-check that the harness itself works (launch app, see welcome).
- Phase 1 acceptance: passenger + driver happy paths green on a clean emulator, run end-to-end in under 5 minutes.
- Server test endpoints covered by Jest in `server` (auth-gating, OTP retrieval, reset side-effects).

## CI plan (deferred)

Phase 1 is local-only. Path forward documented in README:

- Maestro Cloud — upload APK, run flows on managed emulators. Cheapest CI bring-up; ~$X/month.
- Self-hosted Android emulator on GitHub Actions Linux runner — slower, free-ish, but flakier.

CI is a separate spec once Phase 1 is stable.

## Out of scope (for Phase 1)

- iOS simulator runs.
- Chauffeur, rental, vehicle-management flows.
- Edge cases: cancellations, no-shows, payment failures, dispute flows.
- Push notification assertions (Maestro can't verify FCM delivery directly; covered by server tests).
- Real Stripe checkout (use Stripe test mode + a stubbed card flow).

## Phase 2 backlog (not designed yet)

- Chauffeur availability + service request flow.
- Rental booking flow.
- Vehicle add/edit/delete (driver self-service).
- Cancellation matrix (passenger cancels, driver cancels, no-show timeouts).
- Wallet top-up via Stripe test mode.
- Chat real-time (two-emulator run).
- iOS parity once Android is stable.
