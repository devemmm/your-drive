# A4 — Error-Color Inventory

**Date:** 2026-05-11
**Branch:** `feat/qat-slice-a`
**Feeds:** Plan Task 11 (error-color sweep)

## Method

```sh
cd mobile
grep -rn "error?.message\|errors\.\|formState\.errors" src --include="*.tsx" --include="*.ts" | grep -v __tests__ > /tmp/error-sites.txt
grep -rn "Alert\.alert" src --include="*.tsx" --include="*.ts" >> /tmp/error-sites.txt
```

79 raw hits, deduped to the unique rendering surfaces below.

## Key finding: `Input` already themes errors correctly

`mobile/src/components/ui/Input.tsx` is the shared form-field component. Its error styling is centralized:

- Line 54: `inputError: { borderColor: colors.error }` — red border on the input wrapper when `error` prop is truthy.
- Line 65: `error: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs }` — red helper text rendered below the input.

**Implication:** every `<Input error={...} />` caller inherits `colors.error` styling automatically. Task 11 does NOT need to touch these call sites.

## Inventory

### Form fields rendered via `<Input error={...} />` — OK by inheritance

These all pass an `errors.<field>?.message` (from `react-hook-form`) into the shared `Input` component, which themes it via `colors.error`. No change needed in Task 11.

| File | Line | Pattern | Action |
|---|---|---|---|
| `mobile/src/app/(auth)/login.tsx` | 52 | `<Input error={errors.email?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/login.tsx` | 55 | `<Input error={errors.password?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/forgot-password.tsx` | 47 | `<Input error={errors.email?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/register.tsx` | 65 | `<Input error={errors.firstName?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/register.tsx` | 70 | `<Input error={errors.lastName?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/register.tsx` | 75 | `<Input error={errors.email?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/register.tsx` | 78 | `<Input error={errors.password?.message} ... />` | OK — inherits `colors.error` from Input |
| `mobile/src/app/(auth)/register.tsx` | 81 | `<Input error={errors.confirmPassword?.message} ... />` | OK — inherits `colors.error` from Input |

### Error boundaries — inline error text rendering

| File | Line | Current color | Action |
|---|---|---|---|
| `mobile/src/components/ErrorBoundary.tsx` | 30 / 45 | `message` style at line 45: `color: colors.text.secondary` | **needs fix** → render the error message body in `colors.error` (the `AlertTriangle` icon at line 28 already uses `colors.error`; title at line 44 uses `text.primary`). Consider keeping title in `text.primary` and changing only the message text to `colors.error`, OR keep message as `text.secondary` (it's a generic catch-all wrapper for unexpected runtime errors, not a user-facing validation error). **Recommend: change to `colors.error`** for consistency with Input's helper text. |
| `mobile/src/components/MapErrorBoundary.tsx` | 32 (state) / fallback at 47–60 | Title: `text.primary`, hint: `text.secondary`, devHint: `text.secondary` | OK — intentional soft "Maps unavailable" placeholder, not a styled error message. Title intentionally not red because Maps-unavailable is a soft degradation, not a validation failure. Do NOT fix. |

### `Alert.alert(...)` call sites — native system dialog, not themable

`Alert.alert` from `react-native` renders the OS-native UIAlertController (iOS) / AlertDialog (Android). Text color is controlled by the OS, not by the JS theme. No `colors.error` can be applied. These are out of scope for Task 11.

Listed for completeness (all marked **N/A — native dialog**):

| File | Line(s) | Action |
|---|---|---|
| `mobile/src/app/(auth)/register.tsx` | 45 | N/A — native dialog |
| `mobile/src/app/post-ride/index.tsx` | 80, 84, 89, 94, 100, 115, 119, 123, 169 | N/A — native dialog |
| `mobile/src/app/rental/[id].tsx` | 43 | N/A — native dialog |
| `mobile/src/app/(drawer)/profile.tsx` | 90, 111, 125, 152, 161, 175, 181 | N/A — native dialog |
| `mobile/src/app/ride-request/open.tsx` | 59 | N/A — native dialog |
| `mobile/src/app/ride-request/[id].tsx` | 42, 85, 155 | N/A — native dialog |
| `mobile/src/app/vehicle/add.tsx` | 50, 60, 66, 96, 100 | N/A — native dialog |
| `mobile/src/app/ride/[id]/manifest.tsx` | 20 | N/A — native dialog |
| `mobile/src/app/vehicle/[id].tsx` | 86, 106, 116, 133, 136, 144, 157 | N/A — native dialog |
| `mobile/src/app/ride/[id]/index.tsx` | 57, 73, 80, 84, 94, 104 | N/A — native dialog |
| `mobile/src/app/ride/[id]/active.tsx` | 34 | N/A — native dialog |
| `mobile/src/app/chauffeur/availability.tsx` | 46, 110, 119 | N/A — native dialog |
| `mobile/src/app/chauffeur/[id].tsx` | 42 | N/A — native dialog |
| `mobile/src/app/profile/edit.tsx` | 47, 54, 80 | N/A — native dialog |
| `mobile/src/app/chauffeur/service/[id].tsx` | 111, 122, 133, 152, 160 | N/A — native dialog |
| `mobile/src/app/onboarding/driver.tsx` | 49, 80, 84, 88, 112 | N/A — native dialog |
| `mobile/src/components/SearchCard.tsx` | 42, 47, 96, 160 | N/A — native dialog |
| `mobile/src/components/HomeBottomSheet.tsx` | 67, 71, 76, 114, 163 | N/A — native dialog |
| `mobile/src/lib/utils.ts` | 45 (`handleApiError`) | N/A — native dialog |

## Summary

- **8 form-field error sites** across 3 auth screens — all inherit `colors.error` from `Input` component. **OK, no change.**
- **1 error boundary site needs fix**: `mobile/src/components/ErrorBoundary.tsx` line 45 (`message` style currently `colors.text.secondary`).
- **1 error boundary intentionally NOT a fix**: `mobile/src/components/MapErrorBoundary.tsx` — soft fallback, not a validation error.
- **~50 `Alert.alert` call sites**: native system dialog, not themable. Out of scope.

## Spec for Task 11 (the actual sweep)

Single change required:

1. **`mobile/src/components/ErrorBoundary.tsx`** line 45: change `color: colors.text.secondary` → `color: colors.error` on the `message` style.

That's it. The shared `Input` component already handles all form-field error theming, and `Alert.alert` is unthemable.

If Task 11 also wants to migrate `Alert.alert` to a custom toast/snackbar component (to gain themability and unify with web), that's a separate, larger refactor outside the scope of an "error-color sweep" and should be tracked as its own task.
