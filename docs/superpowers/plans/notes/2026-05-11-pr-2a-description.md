# PR 2A — QAT Slice A correctness (A1–A6)

Closes the failing QAT test-script rows from the 2026-05-11 client session.

## Summary
- **A1 (QAT 2.1)** — Android APK launch crash: env-var guard + map error boundary; static triage in `docs/superpowers/plans/notes/2026-05-11-a1-android-crash-triage.md`. Prong (b) verification (rebuild on fresh API 33 emulator with JDK 17) still needs the user's local tooling.
- **A2 (QAT 2.5)** — Stronger password rule (8+ chars, upper, lower, digit) on register/reset/change. Login is exempt.
- **A3 (QAT 2.6)** — T&Cs checkbox + stub Terms screen; submit blocked until accepted.
- **A4** — Form errors rendered with `colors.error` (single-file fix per inventory; most surfaces were already correct via the `Input` primitive).
- **A5 (QAT 2.7)** — Auto sign-in after register; users now land on `/onboarding/verify-phone` instead of being bounced to login.
- **A6 (QAT 2.9)** — Trace confirmed the server already persists referrals via the `Referral` join table. Added a scaffold regression test (skipped pending integration harness) and a new test endpoint + Maestro flow for E2E coverage.

## Spec
`docs/superpowers/specs/2026-05-11-qat-fixes-slice-a-design.md`.

## Verification (automated)
- [x] Server tests: `cd server && npm test` — 26/28 passing (2 skipped, 1 suite skipped — referral regression scaffold blocked on integration harness)
- [x] Mobile type-check: `cd mobile && npx tsc --noEmit` — clean (pre-existing `ride-request/[id].tsx` error unrelated)
- [x] Maestro syntax: `maestro check-syntax` on each flow in `mobile/.maestro/flows` — all OK (smoke, auth/login, auth/register, auth/register-weak-password, auth/register-with-referral)

## Verification (manual — do before merge)
- [ ] Build a fresh Android APK on JDK 17 against an emulator at API 33+ and confirm it opens to Welcome
- [ ] Maestro `flows/smoke.yaml` passes on Android emulator
- [ ] Maestro `flows/auth/*.yaml` passes on iOS simulator
- [ ] Walk QAT rows 2.1, 2.5, 2.6, 2.7, 2.8, 2.9 on a fresh APK install

## Notes
- `auth.passwordRule`, T&Cs labels, and the Terms body in `rw.json` currently mirror the English strings (TODO: translate).
- Task 13 regression test for referral persistence committed as a SKIPPED scaffold; needs a server integration-test harness (`app.ts` refactor, `supertest`, test DB) to unblock. Practical regression coverage today lives in the Maestro `register-with-referral.yaml` flow.
- PR 2B (polish: dark mode, lang toggle, perms) follows on the same branch.
