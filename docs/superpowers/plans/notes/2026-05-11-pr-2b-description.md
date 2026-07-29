# PR 2B — QAT Slice A polish (A7–A10)

Builds on PR 2A (`feat/qat-slice-a`). Do not merge until PR 2A is merged.

## Summary
- **A7 — Dark mode.** Theme refactored into `lightColors` + `darkColors`. New `ThemeProvider` (system follow / manual override, persists in AsyncStorage). All 62 consumers migrated to `useTheme()`. Appearance section added to Profile with system/light/dark radio options.
- **A8 — Language toggle.** i18n init now AsyncStorage-backs the chosen locale. Language section added to Profile with English/Kinyarwanda radio. `profile.language` translated to "Ururimi" for the Maestro flow's assertion.
- **A9 — Push notifications, just-in-time.** New `lib/permissions.ts` helper. `ensurePushPermission()` fires on first successful booking submit + first successful post-ride publish. "Asked-before" tracking prevents re-prompting after deny.
- **A10 — Location, just-in-time.** `ensureLocationPermission()` fires on first home-map mount. On deny, a banner renders on home with "Open Settings" linking to OS settings.
- Test script doc updated to reflect just-in-time permission timing (rows 1.3, 1.4).

## Spec
`docs/superpowers/specs/2026-05-11-qat-fixes-slice-a-design.md`.

## Verification (automated)
- [x] Server tests: `cd server && npm test` — 26 passed, 2 skipped (28 total)
- [x] Mobile type-check: `cd mobile && npx tsc --noEmit` — clean (only pre-existing `ride-request/[id].tsx` error)
- [x] Maestro syntax: all flows OK

## Verification (manual — do before merge)
- [ ] iOS: theme toggle (system / light / dark) on Profile; reopen app, preference persists
- [ ] iOS: language toggle (en / rw) on Profile; reopen app, preference persists; rw renders "Ururimi" for Language section title
- [ ] iOS: fresh install → first booking submit → push prompt appears once
- [ ] iOS: fresh install → revoke location → open home → banner with "Open Settings" appears
- [ ] Android smoke: `maestro test mobile/.maestro/flows/smoke.yaml` passes
- [ ] iOS Maestro: `maestro test mobile/.maestro/flows/auth` + `mobile/.maestro/flows/settings` pass

## Notes
- One known concern (documented in implementer report): `useCurrentLocation` hook also requests permission. Native APIs are idempotent so the user shouldn't see two prompts, but a follow-up to consolidate the permission gate is recommended.
- rw.json still has English placeholders for some keys (`profile.appearance`, `profile.theme.*`, `profile.languageOption.*`, `auth.passwordRule`, `auth.terms.*`, `auth.agreeToTerms*`, `home.locationBanner`, `home.openSettings`). Surface as `TODO(translate)` follow-ups.
- Task 13 referral regression test committed as a skipped scaffold (blocked on server integration-test harness). The Maestro `register-with-referral.yaml` flow is the practical regression guard.
