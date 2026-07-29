# Mobile E2E — Maestro

End-to-end UI tests for the Expo mobile app, driven by [Maestro](https://maestro.mobile.dev).

Spec: [`docs/superpowers/specs/2026-05-07-mobile-e2e-maestro-design.md`](../../docs/superpowers/specs/2026-05-07-mobile-e2e-maestro-design.md).

## What ships in Phase 1

| Area | Status |
|---|---|
| Server `/api/test/*` endpoints (OTP, reset, verify, ride status) | done |
| `server/prisma/test-seed.ts` test fixtures | done |
| Maestro project scaffold (`config.yaml`, `helpers/`, `scripts/`) | done |
| `flows/smoke.yaml` — launches app, asserts welcome | done |
| `flows/auth/login.yaml` — login as seeded passenger | done |
| `flows/auth/register.yaml` — full register + phone OTP flow | done |
| `testID`s on welcome, login, register, verify-phone, home | done |
| `flows/bus/passenger-book-and-board.yaml` — driver puppet, full bus lifecycle | done |
| `flows/bus/driver-setup-and-onboard.yaml` — passenger puppet, full bus lifecycle | done |
| `testID`s on onboarding, post-ride, search-results, ride/[id]/*, vehicle/add, wallet, transactions | partial — post-ride + ride/[id]/* + search-results done; vehicle/add + wallet + transactions still TODO |

The TODO flows need `testID`s on the screens they touch. Use the convention `screen.element` (e.g. `postRide.submitButton`, `rideActive.completeButton`).

## Prerequisites

- Java 17+ and Android Studio with at least one Android emulator (API 33+).
- [Install Maestro](https://maestro.mobile.dev/getting-started/installing-maestro): `curl -Ls "https://get.maestro.mobile.dev" | bash`.
- Node 20+, the repo's `npm install` already run in `server/` and `mobile/`.

## One-time setup

1. Add a separate variant to `mobile/app.config.ts` so the test build can sit alongside dev/prod (e.g. bundle id suffix `.test`). Read `process.env.APP_VARIANT`.
2. Create `mobile/.env.test` with `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` (the Android emulator's host loopback).
3. Build a preview APK pointed at the test API: `eas build --platform android --profile preview-test --local`. Drop the APK at `mobile/.maestro/build/app.apk`.
4. Bring up a dedicated test backend with its own Postgres and run `npm run migrate:deploy` then `npm run seed:test` from `server/`.

### Required server env (test instance)

```
NODE_ENV=development         # or "test", anything other than "production"
TEST_AUTH_TOKEN=<random-32+ char string>
DATABASE_URL=<test postgres url>
```

The test endpoints return 404 unless **both** `NODE_ENV !== "production"` AND `TEST_AUTH_TOKEN` is set. They return 403 if the `x-test-token` header doesn't match.

## Running flows locally

Set the env Maestro needs to talk to the test backend:

```sh
export MAESTRO_APP_ID=com.yourdrive.mobile.test
export MAESTRO_TEST_API_URL=http://10.0.2.2:3000
export MAESTRO_TEST_AUTH_TOKEN=<same as server TEST_AUTH_TOKEN>
```

Boot the emulator, then:

```sh
# Smoke (proves harness works)
maestro test mobile/.maestro/flows/smoke.yaml

# A specific flow
maestro test mobile/.maestro/flows/auth/login.yaml

# Whole suite
maestro test mobile/.maestro/flows
```

On failure Maestro saves screenshots and view hierarchy dumps under `~/.maestro/tests/<run-id>/`.

## Running on Android

The smoke flow is the slice-A regression guard for the Android APK launch crash (QAT 2.1).

```sh
# Boot an Android emulator first (API 33+), then:
export MAESTRO_APP_ID=rw.yourdrive.app         # production bundle id
export MAESTRO_TEST_API_URL=http://10.0.2.2:3000
export MAESTRO_TEST_AUTH_TOKEN=<same as server TEST_AUTH_TOKEN>

# Install the preview APK
adb install -r mobile/build/your-drive.apk

# Smoke
maestro test mobile/.maestro/flows/smoke.yaml
```

The auth and settings flows are iOS-only in this slice; Android is covered only by the smoke flow until follow-up stabilization.

## Running the bus flows

Both bus flows assume the test backend has been migrated and seeded, and the
test build is installed on the simulator with `EXPO_PUBLIC_TEST_MODE=1`.

```sh
maestro test mobile/.maestro/flows/bus/passenger-book-and-board.yaml
maestro test mobile/.maestro/flows/bus/driver-setup-and-onboard.yaml
```

Spec: `docs/superpowers/specs/2026-05-12-bus-booking-maestro-design.md`.
Plan: `docs/superpowers/plans/2026-05-12-bus-booking-maestro.md`.

## Authoring conventions

- **testIDs**: `screen.element` — e.g. `auth.emailInput`, `home.menuButton`. Keep them stable across translations and theme changes.
- **Every flow starts with `runFlow: ../../helpers/reset.yaml`** so suites are order-independent.
- **OTP screens** advance via `runFlow: ../../helpers/fetch-otp.yaml` after setting `env.OTP_PHONE` (or `OTP_EMAIL`).
- **API puppets** live in `mobile/.maestro/scripts/*.js` — small JS files that hit `/api/test/*`. Add new ones rather than embedding HTTP logic inside YAML.
- **Multi-role flows**: the role under test runs in the UI; the partner role's actions are puppeted via `/api/test/rides/:id/status` (or new endpoints we add as needed). Two-emulator runs are reserved for chat/real-time-only flows.

## CI (deferred)

Phase 1 is local-only. Two paths when we're ready:

1. **Maestro Cloud** — upload APK + flows, runs on managed Android emulators. Cheapest CI bring-up.
2. **Self-hosted GitHub Actions** — Linux runner with `reactivecircus/android-emulator-runner`. Free, but flakier than Cloud.

Both need a reachable test backend; production is not an option even with the token gating, since tests truncate user data. Use a dedicated cloud instance or spin one up per CI run via docker-compose.
