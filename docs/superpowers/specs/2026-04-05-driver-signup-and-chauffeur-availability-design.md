# Driver Signup & Chauffeur Availability — Design

**Date:** 2026-04-05
**Branch:** `feat/mobile-app`
**Status:** Approved, pending implementation plan

## Goal

Let a logged-in mobile user (1) discover and complete driver onboarding from their profile, and (2) opt in to being hired as a chauffeur by setting rates and a description. Today the driver onboarding screen exists but is only reachable via a forced redirect when posting a ride, and there is no server endpoint or mobile UI for configuring chauffeur availability.

## Scope

**In scope**
- New mobile entry point to existing driver onboarding.
- New mobile screen for chauffeur availability (first-time opt-in and later edits).
- New server endpoint to persist chauffeur availability fields.
- Extending the mobile `User` type and the `useChauffeur` hook file.

**Out of scope**
- Admin approval workflows for drivers or chauffeurs.
- Schema changes (the four chauffeur fields already exist on `User`).
- Changes to the existing driver onboarding screen.
- Changes to chauffeur search/listing UI.
- Stripe Connect / payout setup (handled elsewhere).

## Flow

Chosen flow: **driver onboarding required, chauffeur availability optional and separate.** Completing driver onboarding makes a user a driver (can post rides). Offering chauffeur services is a distinct opt-in that the user can enable, edit, or turn off later.

Three profile states, three UI affordances:

| State | Profile UI | Destination |
|---|---|---|
| `!isDriverOnboarded` | Card: **Become a Driver** | Existing `/onboarding/driver` |
| `isDriverOnboarded && !isAvailableForChauffeur` | Card: **Offer Chauffeur Services** | New `/chauffeur/availability` |
| `isAvailableForChauffeur` | Existing **My Chauffeur Services** row + new **Edit availability & rates** action on the `/chauffeur` screen | New `/chauffeur/availability` (same route, edit mode) |

## Server

### New endpoint

`PATCH /api/v1/users/me/chauffeur`

**Request body**

```
{
  isAvailableForChauffeur?: boolean
  chauffeurHourlyRate?: number | null    // null explicitly clears
  chauffeurDailyRate?: number | null     // null explicitly clears
  chauffeurDescription?: string | null   // null explicitly clears
}
```

`undefined` leaves a field unchanged. `null` clears it. This lets the mobile form clear a rate a user no longer wants to offer.

**Response**: the updated chauffeur fields on the user (shape to match how the existing `/me` endpoint returns them — confirmed during plan).

### Validation

Enforced in the controller / request validator:

- `isAvailableForChauffeur === true` with no effective rate (neither in payload nor already on the user row) → `400 "At least one of hourly or daily rate is required to offer chauffeur services"`.
- `chauffeurHourlyRate` or `chauffeurDailyRate` ≤ 0 → `400`.
- `chauffeurDescription.length > 500` → `400`.
- `!req.user.isDriverOnboarded` → `403 "Complete driver onboarding before offering chauffeur services"`.
- `req.user.role === 'admin'` → `403` (mirrors existing guard in `onboarding.controller.ts`).
- Auth failure → `401` (existing middleware).

### Controller location

New controller method `updateChauffeurAvailability`. During plan writing, decide whether it lives in the existing `onboarding.controller.ts` or a `user.controller.ts` based on where `/users/me/*` routes currently live. No assumption here — the plan step will read the router and choose to match the prevailing pattern.

### Route registration

Registered alongside the existing `/users/me/*` routes. Same auth middleware as other authenticated user routes.

## Mobile

### New screen: `mobile/src/app/chauffeur/availability.tsx`

Single-page form, used for both first-time opt-in and editing. Fields:

1. **Availability toggle** (`isAvailableForChauffeur`). Defaults to `true` when the screen is opened from the "Offer Chauffeur Services" card; reflects current value when editing.
2. **Hourly rate** — numeric input.
3. **Daily rate** — numeric input.
4. **Description** — textarea, 500-char soft cap with counter.
5. **Submit button**.

### Form validation (client-side, mirrors server)

- Toggle **on** + both rate fields empty → submit disabled, inline hint under rates: "Enter at least one rate".
- Rate fields: reject negative/zero on blur with inline error.
- Description: character counter, soft warning at 500.
- Toggle **off** skips rate validation — user can disable availability without clearing rates.
- Clearing a rate: when the field is blank *and* the user had a value previously, send explicit `null` in the PATCH payload.
- Server errors surface via the same toast/banner pattern used by the existing onboarding screen.

### Profile changes (`mobile/src/app/(tabs)/profile.tsx`)

Add two state-aware cards (both hidden when their condition is not met):

- "Become a Driver" — visible iff `!user.isDriverOnboarded`, routes to `/onboarding/driver`.
- "Offer Chauffeur Services" — visible iff `user.isDriverOnboarded && !user.isAvailableForChauffeur`, routes to `/chauffeur/availability`.

The existing "My Chauffeur Services" row stays as-is; an **Edit availability & rates** action is added *on the `/chauffeur` screen itself*, not in the profile menu, routing to `/chauffeur/availability`.

### Types (`mobile/src/lib/types.ts`)

Extend the `User` type with:

```
isAvailableForChauffeur?: boolean
chauffeurHourlyRate?: number | null
chauffeurDailyRate?: number | null
chauffeurDescription?: string | null
```

During plan writing, verify the server's `/me` response already includes these fields; if not, extend the user serializer.

### Hook (`mobile/src/hooks/useChauffeur.ts`)

Add a `useChauffeurAvailability` mutation hook that:

1. Calls `PATCH /users/me/chauffeur` with the form payload.
2. On success, updates the local user store (whatever the app already uses — the explorer confirmed `user.isDriverOnboarded` is already held client-side) with the returned fields.
3. Returns `{ mutate, isPending, error }` matching the shape of existing hooks in the file.

### Edge cases

- User deep-links to `/chauffeur/availability` without driver onboarding → screen detects `!user.isDriverOnboarded` and redirects to `/onboarding/driver` with a message. Mirrors the server's 403.
- User toggles availability **off** → rates and description persist in the DB; re-enabling later does not require re-entry.
- First-time opt-in: the screen opens with the toggle on and empty rate fields; user cannot submit until at least one rate is entered.

## Testing

**Server**
- Match the existing test framework/location used in `server/` (confirmed during plan).
- Cases: happy path (opt-in with one rate, opt-in with both rates, edit rates, toggle off, toggle back on with rates already present), 400 for no-rate opt-in, 400 for negative rate, 400 for overlong description, 403 for non-onboarded user, 403 for admin, 401 unauthenticated, merge-with-existing-state (payload only sets `isAvailableForChauffeur: true`, rate already on the user row → allowed).

**Mobile**
- No automated form tests unless the project already has a pattern for them (to confirm during plan).
- Manual test plan: first-time opt-in happy path, edit rates, clear a rate (null payload), toggle off, toggle on without rates (blocked client-side), deep-link to `/chauffeur/availability` when not driver-onboarded (redirect), server-error surfacing.

## Open items to confirm during plan writing

These are *not* design ambiguities — they are "match the existing codebase" items the plan step will read the code to resolve:

- Exact controller file for the new endpoint (`onboarding.controller.ts` vs a `user.controller.ts`).
- Exact router file where `/users/me/*` routes are registered.
- Validator library the project uses (Zod / class-validator / express-validator).
- Whether the `/me` response already serializes the four chauffeur fields.
- Test framework and directory layout under `server/`.
- Toast/error-banner pattern used by the existing `onboarding/driver.tsx` screen (to match).
- The user store/context mechanism the mobile app uses to hold and update `user.*` fields after mutations.
