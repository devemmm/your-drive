# QAT Fixes — Slice A Design

**Status:** Draft for review
**Date:** 2026-05-11
**Branch:** `feat/qat-slice-a`
**Source of feedback:** Client QAT session against `docs/mobile-app-test-script.md`, plus flow diagram and improvement list shared in chat on 2026-05-11.

## Background

The client ran the YourDrive mobile app through the test script and returned a mixed list: bug fixes for failed rows, soft improvements on passing rows, feature requests, and a redesigned app flow with role-specific routing.

This is too much for one spec. The full feedback decomposes into four slices, sequenced by priority:

- **Slice A (this spec):** Tactical QAT correctness fixes + small client-improvement polish. Closes the failed test-script rows.
- **Slice B (next):** Auth-gate inversion (public-first browsing), phone-only registration, role-specific post-register redirect, bottom-sheet home redesign. The "main thing" the client emphasized.
- **Slice C:** Driver verification pipeline (document upload, admin approval queue, `canPostRide` gating).
- **Slice D:** New domains (bus-with-GPS ticketing, car-rental company flow). Already drafted in `docs/client-requests/`.

Slice A is intentionally scoped to changes that do not depend on the auth-flow restructure in Slice B.

## Goals

1. Make the Android APK launch without crashing.
2. Close every `FAIL` row in the QAT session against test rows 2.x and 3.x where the cause is in our code (i.e. excluding 3.5/3.6/3.7 which are blocked on email-sender configuration and are revisited in a separate operational task).
3. Add the four client-requested improvements that do not require restructuring the app: dark mode, language toggle UI, just-in-time push permission, just-in-time location permission.
4. Every fix is gated by an automated test — a Maestro flow on mobile and/or a Jest test on the server — except where the surface is OS-level (permission prompts) and can only be verified manually.

## Non-goals

- Public-first browsing, phone-only registration, role-specific home redirect, bottom-sheet home redesign (**Slice B**).
- Driver verification documents, admin approval workflow (**Slice C**).
- Bus ticketing, car rental company flow (**Slice D**).
- Email-sending infrastructure for password reset / verification (QAT rows 3.5–3.7) — separate operational task.
- Sentry / crash-reporting instrumentation, CI for Maestro on Android, role-specific post-register routing.

## Approach

A single feature branch `feat/qat-slice-a` off `main`, with **two PRs merged sequentially**:

- **PR 2A — QAT correctness.** Items A1–A6. Targets the failed test-script rows. Maestro flows added/extended for every fix where E2E is feasible.
- **PR 2B — Polish.** Items A7–A10. Client-improvement requests. Maestro coverage where assertable; permission prompts noted as OS-level / not Maestro-coverable.

PR 2B does not merge until PR 2A is merged. If A1 turns into a deep build investigation, A1 splits into its own PR and 2A continues without it on iOS-only — but only on evidence, not pre-emptively.

Commit convention follows existing repo style: `fix(scope): …`, `feat(scope): …`.

## Slice A inventory

| ID | Fix | QAT row | PR |
|---|---|---|---|
| A1 | Android APK launch crash | 2.1 | 2A |
| A2 | Password strength validation | 2.5 | 2A |
| A3 | Terms & Conditions checkbox | 2.6 | 2A |
| A4 | Error messages in red (audit + sweep) | cross-cutting (covers 2.8 polish) | 2A |
| A5 | Auto-login after successful registration | 2.7 polish | 2A |
| A6 | Referral code persists & links | 2.9 | 2A |
| A7 | Dark mode (system-follow + manual override) | client improvement | 2B |
| A8 | Language toggle UI (en/rw) | client improvement | 2B |
| A9 | Push notification permission (just-in-time) | client improvement | 2B |
| A10 | Location permission (just-in-time) | client improvement | 2B |

## A1 — Android APK launch crash

The client's APK installs but crashes on launch. No logs were captured during QAT; reproduction is from scratch.

**Procedure**

1. **Reproduce.** `eas build --platform android --profile preview --local`. Install on a fresh Android emulator (API 33+). Capture `adb logcat *:E ReactNativeJS:V ExpoModulesCore:V`.
2. **Triage.** Most likely categories given the project: native-module init order (`react-native-maps`, `react-native-google-places-autocomplete`), missing `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in the Android manifest, Hermes / new-arch incompatibility, missing required permission entry.
3. **Fix** based on triage.
4. **Lock.** Add Android run instructions to `mobile/.maestro/README.md`. The existing `flows/smoke.yaml` is the regression guard — it must pass on an Android emulator before PR 2A merges.

**Time-box:** 1 working day on reproduction + triage. If the cause is still unidentified after that, A1 splits into its own PR and the remainder of PR 2A proceeds on iOS-only.

**Out of scope:** Sentry instrumentation, Android CI.

## A2 — Password strength validation

Today (`mobile/src/app/(auth)/register.tsx:20`) the zod schema is `z.string().min(6, …)`. The server validator is at least as loose — `password` was accepted in QAT.

**Rule (confirmed with client):** minimum 8 characters, at least one uppercase, one lowercase, one digit. No symbol required (Rwandan keyboard ergonomics).

**Mobile changes**

- `mobile/src/app/(auth)/register.tsx`: replace `min(6, …)` with chained checks. Single combined error message keyed to a new translation: `auth.passwordRule`.
- The same rule is enforced in any future password-set surface (reset / change). Today only register is exposed — verify by grep before merging.

**Server changes**

- `server/src/middlewares/validators/auth.request.validator.ts` and any sibling `user.request.validator.ts`: mirror the rule on every endpoint that sets a password (register, reset-password, change-password where present). Use `body("password").isLength({ min: 8 }).matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/)`. Failure returns a translation key that the mobile client already understands.
- **Login is exempt.** Existing accounts with old short passwords continue to log in; the new rule only fires when a password is **set**.

**Translations**

- Add `auth.passwordRule` to `mobile/src/translations/en.json` and `rw.json`.

## A3 — Terms & Conditions checkbox

Today `mobile/src/app/(auth)/register.tsx:43` hardcodes `agreeToTerms: true` in the register payload — the UI lies. The server already accepts the field.

**Locked behavior:** the checkbox links to a stubbed in-app T&Cs page; the page contains placeholder copy. Real content replaces the stub later without re-spec.

**Changes**

- **New** `mobile/src/app/(auth)/terms.tsx`: a `ScrollView` screen with header and placeholder body. Translated strings under `auth.terms.*`.
- **Register form** (`register.tsx`):
  - Add `agreeToTerms: z.literal(true, { errorMap: … })` to the zod schema.
  - Replace the hardcoded `true` at line 43 with the form value.
  - Add a checkbox row above the submit button; tapping the "Terms & Conditions" text in the label navigates to `/(auth)/terms`.
  - Reuse `components/ui/Checkbox` if it exists; otherwise build a minimal Pressable + lucide `Square`/`CheckSquare` component in the same folder.

**testIDs added:** `register.termsCheckbox`, `register.termsLink`, `terms.screen`.

**No server change.** Validator already accepts `agreeToTerms`.

## A4 — Error messages in red

`mobile/src/lib/theme.ts:14` defines `colors.error: "#EF4444"`. The token exists; the issue is whether every error surface actually uses it.

**Procedure**

1. **Inventory.** Grep `mobile/src` for `error?.message`, `errors.*?.message`, `formState.errors`, `Alert.alert`, and any helper-text/toast usage. List any rendering path that styles error text with `colors.text.secondary`, `colors.text.primary`, or hardcoded values.
2. **Fix.** Route every form-error and toast-error through `colors.error`. Centralize via the existing `Input` component's `error` prop where possible. Helper text under inputs uses the same token.
3. **Guardrail.** The PR description lists every file touched so the client can spot-check.

**Out of scope:** success/warning copy colors, network-failure banner colors (separate design pattern).

## A5 — Auto-login after successful registration

Today (`register.tsx:45-47`) the register handler pops `Alert.alert("…Please log in.")` and routes to `/(auth)/login`. The client wants direct redirect into the app.

**Changes**

- `useRegister` in `mobile/src/hooks/useAuth.ts` already returns the same `AuthResponse` shape as `useLogin`. Reuse the auth-persistence path that `useLogin`'s consumers take — confirm by reading `mobile/src/app/(auth)/login.tsx` and `AuthProvider.tsx`. The register screen's `onSubmit` writes the returned token via the same `AuthProvider` setter login uses.
- Replace the `Alert.alert` + manual redirect with `router.replace("/onboarding/verify-phone")`.
- The existing Maestro `flows/auth/register.yaml` (lines 32-44 are a manual login block) is rewritten: after `register.submitButton` the flow waits directly for `verifyPhone.phoneInput`. The flow rewrite is the regression guard.

**Out of scope:** role-specific post-register routing (Slice B).

## A6 — Referral code persistence

The mobile side already sends `?referralCode=…` (`mobile/src/hooks/useAuth.ts:14-16`) and the server validator accepts it (`auth.request.validator.ts:57`). QAT 2.9 failed because the link was not persisted on the new user.

**Procedure**

1. **Investigate.** Read the register handler in `server/src/controllers/`. Confirm whether `req.query.referralCode` is read, whether it is stored on the new user record, and whether the inviter is credited / linked.
2. **Fix scope.** Use whatever schema already exists. If the user model has `referredById` or equivalent, set it on user-create.
3. **No new tables without confirmation.** If proper attribution tracking would require a migration, surface that as a follow-up question rather than slipping it into a "tactical" slice.

**Tests**

- `server/__tests__/auth/register-referral.test.ts`: valid code persists link; invalid code returns a clean error without crashing; missing code is unaffected.

## A7 — Dark mode (system-follow + manual override)

The biggest lift in slice A. `mobile/src/lib/theme.ts` is a flat object with no light/dark split and no `useColorScheme` consumer.

**Theme refactor**

- `mobile/src/lib/theme.ts`:
  - Export `lightColors` and `darkColors` with the same shape as today's `colors`.
  - `spacing`, `fontSize`, `borderRadius` remain unchanged (theme-invariant).

**Provider**

- **New** `mobile/src/providers/ThemeProvider.tsx`:
  - State: user preference `"system" | "light" | "dark"`, persisted in `AsyncStorage` under key `@yourdrive/theme`.
  - Resolves the active palette from preference + `useColorScheme()`.
  - Exposes `useTheme()` returning `{ colors, preference, setPreference }`.
  - Mounted in `app/_layout.tsx` outside `AuthProvider` so auth screens are themed too.

**Mass migration of consumers**

- Every file that imports `{ colors } from "@/lib/theme"` switches to `const { colors } = useTheme()`. `spacing` / `fontSize` / `borderRadius` continue to be imported from the module.
- For files where styles are declared at module scope (`const styles = StyleSheet.create({…, color: colors.text.primary})`), styles become a factory: `const makeStyles = (colors) => StyleSheet.create({…})`, invoked as `const styles = useMemo(() => makeStyles(colors), [colors])` inside the component.

**Settings UI**

- `mobile/src/app/(drawer)/profile.tsx`: add an "Appearance" section with three radio options — System / Light / Dark. Wired to `setPreference`.

**testIDs added:** `profile.appearanceSection`, `profile.themeOption.system|light|dark`, plus a hidden theme marker in `_layout.tsx` (`app.themeMarker.light` / `app.themeMarker.dark`) for Maestro to assert against.

**Out of scope:** animated transitions, per-screen overrides, accessibility high-contrast.

## A8 — Language toggle UI

Translations and `react-i18next` already exist (`mobile/src/translations/i18n.ts`, `en.json`, `rw.json`).

**Changes**

- `mobile/src/app/(drawer)/profile.tsx`: add a "Language" section with two options — English / Kinyarwanda. Wired to `i18n.changeLanguage` and persisted in `AsyncStorage` under `@yourdrive/lang`.
- `mobile/src/translations/i18n.ts`: read the persisted value before mounting; fall back to device locale.

**testIDs added:** `profile.languageSection`, `profile.languageOption.en|rw`.

**No new translation keys** beyond those introduced for A2 and A3.

## A9 — Push notification permission (just-in-time)

**Helper**

- **New** `mobile/src/lib/permissions.ts` with `ensurePushPermission()` — checks current status, requests if `undetermined`, returns `granted | denied`. Records "asked before" in `AsyncStorage` to avoid re-prompting after denial.

**Trigger points (just-in-time):**

- First successful ride **booking submit** in the ride-request / ride-booking flow.
- First successful **post-ride publish** in the post-ride flow.

If granted, register the device token with the server using the existing endpoint if one exists; otherwise log a TODO and skip token registration this slice (note as a follow-up).

**No prompt on app open. No prompt during signup.**

## A10 — Location permission (just-in-time)

**Helper**

- `ensureLocationPermission()` in the same `mobile/src/lib/permissions.ts`.

**Trigger point:** first time the user opens the home map screen or any `LocationPicker` — whichever fires first. This explicitly diverges from QAT row 1.3 (which expects a prompt on first launch); the test script is updated in PR 2B to reflect the change.

**Denial path:** show an inline banner on the map screen — `"Enable location in settings to see nearby drivers"` — with a button that opens OS settings via `Linking.openSettings()`. Banner has `testID="home.locationBanner"` so Maestro can assert the denied-path UX.

## Maestro coverage matrix

| Fix | Coverage | Strategy |
|---|---|---|
| A1 | ✅ | Reuse `flows/smoke.yaml` on Android. Documented run command in `mobile/.maestro/README.md`. |
| A2 | ✅ | New `flows/auth/register-weak-password.yaml`: type `password` (no upper, no digit) → expect error; `passw0rd1` (no upper) → expect error; `Pa1` (too short) → expect error; `Password1` → succeeds. |
| A3 | ✅ | Extend `flows/auth/register.yaml`: submit without tick → expect error; tap T&Cs link → assert `terms.screen` visible; tick → proceed. |
| A4 | ⚠️ | Color-asserting in Maestro is brittle. Cover via existing flows that already trigger errors (invalid email, wrong password). Visual check on the PR. No dedicated color flow. |
| A5 | ✅ | Rewrite `flows/auth/register.yaml`. After `register.submitButton` the flow waits directly for `verifyPhone.phoneInput`. The rewrite IS the regression guard. |
| A6 | ✅ | Server Jest test on the controller + new `flows/auth/register-with-referral.yaml`. Add server test endpoint `GET /api/test/users/:id` returning `referredById` so the Maestro flow can assert via script. |
| A7 | ✅ | New `flows/settings/theme-toggle.yaml`. Tap Appearance → Dark → assert `app.themeMarker.dark` visible. Reopen app → preference persists. |
| A8 | ✅ | New `flows/settings/language-toggle.yaml`. Toggle to RW → assert a known Kinyarwanda string on Profile. Reopen app → preference persists. |
| A9 | ❌ | OS-level dialog. Maestro can `allow all` at launch but cannot assert the prompt fired at a specific moment. Manual coverage. |
| A10 | ❌ + ✅ | Prompt itself is manual. Denied-path banner can be E2E'd: revoke perm at launch, open map, assert `home.locationBanner` visible. |

### New testIDs

- `register.termsCheckbox`, `register.termsLink`, `terms.screen`
- `profile.appearanceSection`, `profile.themeOption.system`, `profile.themeOption.light`, `profile.themeOption.dark`
- `profile.languageSection`, `profile.languageOption.en`, `profile.languageOption.rw`
- `app.themeMarker.light`, `app.themeMarker.dark` (hidden sentinels in `_layout.tsx`)
- `home.locationBanner`

### Server-side tests + endpoints

- `server/__tests__/auth/register-referral.test.ts`
- `server/__tests__/auth/password-validator.test.ts` (table-driven)
- **New test endpoint** `GET /api/test/users/:id` returning the user record with `referredById`. Same `NODE_ENV !== "production"` + `TEST_AUTH_TOKEN` gate as the existing test endpoints.

## Verification gates

### PR 2A merges only when

- `maestro test flows/smoke.yaml` passes on **both** iOS sim and Android emulator.
- `maestro test flows/auth` passes on iOS sim.
- `cd server && npm test` passes.
- Manual run-through of QAT rows 2.1, 2.5, 2.6, 2.7, 2.8, 2.9 on a fresh APK install — recorded in the PR description.

### PR 2B merges only when

- `maestro test flows/settings` passes on iOS sim.
- Manual run-through on iOS + Android: theme system-follow, theme manual override, lang toggle persistence, location prompt on first map open, push prompt on first booking, denied-location banner.
- `docs/mobile-app-test-script.md` updated: rows 1.3 / 1.4 reflect "permission prompts at point of use" rather than first-launch.

## Risks

- **A1 unknown root cause.** Time-boxed to 1 working day on reproduction + triage. If still unidentified after that, A1 splits into its own PR; 2A proceeds without it on iOS-only.
- **A7 file churn.** Every screen importing `colors.*` becomes a small mechanical change. Risk: a missed file silently stays light-themed in dark mode. Mitigation: pre-merge grep ensures no remaining static `colors` imports in `mobile/src/`.
- **A6 schema unknown.** If proper attribution tracking would require a migration, that is escalated to the client before slipping it into a tactical slice.
- **Maestro Android stability.** Android emulator + Google Maps + Hermes can flake. Auth flows are explicitly iOS-only in this slice; only `smoke.yaml` runs on Android.

## Open questions for the client

None — all four design choices have been answered. A2 password rule, A7 dark-mode behavior, A3 T&Cs source, A9/A10 permission timing all locked.

## Out-of-slice references

- Slice B feedback summary: public-first browsing, phone-only registration, role-specific post-register redirect, bottom-sheet home redesign. Flow diagram shared by client 2026-05-11.
- Slice C: driver verification (license, yellow card, vehicle, insurance, authorization) + admin approval queue + `canPostRide` gating.
- Slice D: bus-with-GPS ticketing (`docs/client-requests/bus-ticketing.md`), car rental company flow (`docs/client-requests/car-rental.md`).
