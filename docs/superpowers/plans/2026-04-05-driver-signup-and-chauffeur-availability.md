# Driver Signup & Chauffeur Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a discoverable mobile entry point to existing driver onboarding, plus a new chauffeur-availability opt-in flow (new server endpoint + new mobile screen) so a logged-in user can register to be hired as a chauffeur.

**Architecture:** Two-layer change. (1) Server adds a single authenticated `PATCH /users/chauffeur-availability` endpoint that updates four existing `User` fields (`isAvailableForChauffeur`, `chauffeurHourlyRate`, `chauffeurDailyRate`, `chauffeurDescription`), gated on `isDriverOnboarded`. (2) Mobile adds state-aware profile cards and a new `/chauffeur/availability` screen (used for both first-time opt-in and later edits) that calls the new endpoint via a React Query mutation hook. Driver onboarding itself is not modified — an entry point is simply added to the profile tab.

**Tech Stack:** TypeScript everywhere. Server: Express, Prisma, express-validator, `catchAsync`/`AppError` pattern. Mobile: Expo Router, React Query (@tanstack/react-query), axios wrapper at `@/services/api`, native `Alert` for errors (no toast lib).

**Spec:** `docs/superpowers/specs/2026-04-05-driver-signup-and-chauffeur-availability-design.md`

**Deviation from spec (discovered during plan writing):** The spec placed the "Edit availability & rates" action on the existing `/chauffeur` screen. That screen (`mobile/src/app/chauffeur/index.tsx`) is a *browse-drivers-for-hire* screen, so putting a "manage your own availability" button there would confuse users. Instead, all three states are handled by profile cards: `Become a Driver` / `Offer Chauffeur Services` / `Manage Chauffeur Availability`. The `/chauffeur` browse screen is untouched.

**Testing note:** The server repo has **no existing automated tests** and no `jest.config*` file, despite `jest` being in `package.json`. Introducing test infrastructure for a single endpoint is out of scope; the plan uses curl-based manual verification for the server. Mobile likewise has no existing tests — manual QA steps are provided. If the project adds Jest infrastructure later, the existing controller (`updateChauffeurAvailability`) is designed to be testable (pure logic + Prisma calls).

---

## File Structure

### Server files

| File | Action | Responsibility |
|---|---|---|
| `server/src/types/index.ts` | Modify | Add 4 chauffeur fields to `profileSelects` |
| `server/src/middlewares/validators/user.request.validator.ts` | Modify | Add `updateChauffeurAvailabilityValidator` |
| `server/src/controllers/user.controller.ts` | Modify | Add `updateChauffeurAvailability` static method |
| `server/src/routes/user.routes.ts` | Modify | Wire `PATCH /chauffeur-availability` |

### Mobile files

| File | Action | Responsibility |
|---|---|---|
| `mobile/src/lib/types.ts` | Modify | Extend `User` interface with 4 chauffeur fields |
| `mobile/src/hooks/useChauffeur.ts` | Modify | Add `useUpdateChauffeurAvailability` mutation hook |
| `mobile/src/app/chauffeur/availability.tsx` | Create | New screen (opt-in + edit form) |
| `mobile/src/app/chauffeur/_layout.tsx` | Modify | Register `availability` route in stack |
| `mobile/src/app/(tabs)/profile.tsx` | Modify | Add 3 state-aware menu items (Services section) |

---

## Task 1: Extend `profileSelects` with chauffeur fields

Before any new endpoint exists, the `GET /users/profile` response must already include the four chauffeur fields so the mobile `user` object carries them into React state. This single change unblocks all client-side state logic.

**Files:**
- Modify: `server/src/types/index.ts:42-79`

- [ ] **Step 1: Add the four fields to `profileSelects`**

Open `server/src/types/index.ts`. Add these four lines inside the `profileSelects` object, right after `isDriverOnboarded: true,` (currently line 58):

```typescript
isDriverOnboarded: true,
isAvailableForChauffeur: true,
chauffeurHourlyRate: true,
chauffeurDailyRate: true,
chauffeurDescription: true,
isStripeOnboarded: true,
```

- [ ] **Step 2: Type-check the server**

Run from `/Users/adrianmaenzanise/Projects/Node/your-drive/server`:

```bash
npx tsc --noEmit
```

Expected: no errors. (Prisma's generated types already include these four fields — see `server/prisma/schema.prisma` lines 104-111 — so `as const` will accept them.)

- [ ] **Step 3: Commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add server/src/types/index.ts
git commit -m "feat(server): expose chauffeur fields in profileSelects

Add isAvailableForChauffeur, chauffeurHourlyRate, chauffeurDailyRate,
and chauffeurDescription to the shared profileSelects so the /users/profile
response carries them for the upcoming chauffeur availability feature."
```

---

## Task 2: Add request validator for chauffeur availability

The validator enforces types and formats. The cross-field rule (at-least-one-rate when enabling availability) requires the user's current DB state, so it lives in the controller, not the validator. The validator enforces only payload-local rules.

**Files:**
- Modify: `server/src/middlewares/validators/user.request.validator.ts`

- [ ] **Step 1: Append the new validator at the end of the file**

Add at the end of `server/src/middlewares/validators/user.request.validator.ts`:

```typescript
export const updateChauffeurAvailabilityValidator = [
  body("isAvailableForChauffeur")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.isAvailableForChauffeur_boolean"))
    .toBoolean(),

  body("chauffeurHourlyRate")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error("chauffeurHourlyRate must be a positive number or null");
      }
      return true;
    }),

  body("chauffeurDailyRate")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new Error("chauffeurDailyRate must be a positive number or null");
      }
      return true;
    }),

  body("chauffeurDescription")
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null) return true;
      if (typeof value !== "string") {
        throw new Error("chauffeurDescription must be a string or null");
      }
      if (value.length > 500) {
        throw new Error("chauffeurDescription must be 500 characters or fewer");
      }
      return true;
    }),
];
```

Note: the existing validators in this file use `validationMsg("validation.<key>")` for i18n. For the rate and description fields, we use plain English messages via `.custom()` because adding new i18n keys is out of scope and the existing pattern doesn't easily cover the `null`-or-positive-number rule. The `isAvailableForChauffeur` field uses an i18n key (`validation.isAvailableForChauffeur_boolean`) — if that translation key does not yet exist in the translation JSON files, validation will still work (the middleware falls back to the key name). Adding translations later is a non-blocking follow-up.

- [ ] **Step 2: Type-check**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/server
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/middlewares/validators/user.request.validator.ts
git commit -m "feat(server): add updateChauffeurAvailabilityValidator

Payload-local validation for the new PATCH /users/chauffeur-availability
endpoint. Cross-field rules (e.g. at-least-one-rate when enabling) are
enforced in the controller because they depend on the current DB state."
```

---

## Task 3: Add `updateChauffeurAvailability` controller method

This is where the real business logic lives: the driver-onboarded gate, the admin gate, the merge-with-existing-state rule ("if enabling availability, at least one rate must exist — in payload or already in DB"), and the Prisma update.

**Files:**
- Modify: `server/src/controllers/user.controller.ts`

- [ ] **Step 1: Locate imports in `user.controller.ts`**

Open `server/src/controllers/user.controller.ts`. Check the top of the file for existing imports. You should see imports for `Request`, `Response`, `NextFunction`, `prisma`, `AppError`, `catchAsync`, `matchedData`, `DbUser`, `UserRole`, and `profileSelects`. If any of these (specifically `UserRole`) are not yet imported and are needed for the admin check, add the missing import matching the pattern already used in `server/src/controllers/onboarding.controller.ts:210` (which imports `UserRole` from `@prisma/client`).

- [ ] **Step 2: Add the method to the `UserController` class**

Add this method inside the `UserController` class (or as a static export, matching the existing pattern in the file — check how `updateProfile` is defined and mirror it exactly):

```typescript
static updateChauffeurAvailability = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user! as DbUser;
    const isEnglishPreferred = req.isEnglishPreferred;

    // Admins cannot have chauffeur profiles
    if (user.role === UserRole.ADMIN) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Admins cannot update chauffeur availability"
            : "Les administrateurs ne peuvent pas mettre à jour la disponibilité du chauffeur",
          403
        )
      );
    }

    // Must have completed driver onboarding first
    if (!user.isDriverOnboarded) {
      return next(
        AppError(
          isEnglishPreferred
            ? "Complete driver onboarding before offering chauffeur services"
            : "Terminez l'intégration du conducteur avant d'offrir des services de chauffeur",
          403
        )
      );
    }

    const payload = matchedData<{
      isAvailableForChauffeur?: boolean;
      chauffeurHourlyRate?: number | null;
      chauffeurDailyRate?: number | null;
      chauffeurDescription?: string | null;
    }>(req, { locations: ["body"] });

    // Compute the merged state: what the row will look like after update
    const willBeAvailable =
      payload.isAvailableForChauffeur ?? user.isAvailableForChauffeur;
    const willHaveHourlyRate =
      payload.chauffeurHourlyRate !== undefined
        ? payload.chauffeurHourlyRate !== null
        : user.chauffeurHourlyRate !== null;
    const willHaveDailyRate =
      payload.chauffeurDailyRate !== undefined
        ? payload.chauffeurDailyRate !== null
        : user.chauffeurDailyRate !== null;

    // If enabling availability, at least one rate must exist after the update
    if (willBeAvailable && !willHaveHourlyRate && !willHaveDailyRate) {
      return next(
        AppError(
          isEnglishPreferred
            ? "At least one of hourly or daily rate is required to offer chauffeur services"
            : "Au moins un tarif horaire ou journalier est requis pour offrir des services de chauffeur",
          400
        )
      );
    }

    // Build the Prisma update data — only include fields that were in the payload
    const updateData: {
      isAvailableForChauffeur?: boolean;
      chauffeurHourlyRate?: number | null;
      chauffeurDailyRate?: number | null;
      chauffeurDescription?: string | null;
    } = {};
    if (payload.isAvailableForChauffeur !== undefined) {
      updateData.isAvailableForChauffeur = payload.isAvailableForChauffeur;
    }
    if (payload.chauffeurHourlyRate !== undefined) {
      updateData.chauffeurHourlyRate = payload.chauffeurHourlyRate;
    }
    if (payload.chauffeurDailyRate !== undefined) {
      updateData.chauffeurDailyRate = payload.chauffeurDailyRate;
    }
    if (payload.chauffeurDescription !== undefined) {
      updateData.chauffeurDescription = payload.chauffeurDescription;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: profileSelects,
    });

    return res.status(200).json({
      success: true,
      data: { user: updatedUser },
      message: isEnglishPreferred
        ? "Chauffeur availability updated successfully"
        : "Disponibilité du chauffeur mise à jour avec succès",
    });
  }
);
```

**Notes:**
- Prisma accepts plain JS `number` for `Decimal` fields; no `Prisma.Decimal` wrapper needed. Pattern matches `server/src/controllers/chauffeur.controller.ts` lines 580-582.
- `undefined` payload fields are omitted from the update, preserving DB values. `null` explicitly clears a field — this is what the mobile form sends when a user empties a rate field that was previously set.
- `req.user` is populated by `isAuthenticated` middleware and already contains the current values of `isAvailableForChauffeur` and the two rate fields (because `profileSelects` was extended in Task 1 — verify this assumption in the next step).

- [ ] **Step 3: Verify `req.user` carries the new fields**

Check how `req.user` is populated. Look at `server/src/middlewares/isAuthenticated.ts` (or similar). Confirm it uses `profileSelects` or a wider selection. If it does NOT include `isAvailableForChauffeur`, `chauffeurHourlyRate`, `chauffeurDailyRate`, then the merge-state logic in the controller will see `undefined` instead of actual values and break.

Run:

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/server
grep -rn "isAuthenticated" src/middlewares/ | head -5
```

Then read the file that defines the `isAuthenticated` middleware. If it selects a narrower set of user fields than `profileSelects`, **expand the selection** to include at minimum `isAvailableForChauffeur`, `chauffeurHourlyRate`, `chauffeurDailyRate`, `isDriverOnboarded`, and `role`. If it already uses `profileSelects` or selects the full user, you're done.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/user.controller.ts server/src/middlewares/isAuthenticated.ts
git commit -m "feat(server): add updateChauffeurAvailability controller

Handles PATCH /users/chauffeur-availability. Enforces admin guard,
driver-onboarded guard, and the at-least-one-rate rule by merging
the payload against the current DB state (so toggling on is allowed
when a rate already exists in the row)."
```

(Only include `isAuthenticated.ts` in the commit if Step 3 required changes.)

---

## Task 4: Register the route

**Files:**
- Modify: `server/src/routes/user.routes.ts`

- [ ] **Step 1: Add the route**

Open `server/src/routes/user.routes.ts`. Add this block after line 47 (after the existing `/update` route), following the same structure as the other authenticated routes:

```typescript
router.route("/chauffeur-availability").patch(
  userValidators.updateChauffeurAvailabilityValidator,
  validateRequestBody,
  UserController.updateChauffeurAvailability
);
```

The route inherits `isAuthenticated` + `languagePreference` from the `router.use(...)` at line 13, so no extra middleware needed.

- [ ] **Step 2: Type-check and start the server**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/server
npx tsc --noEmit
```

Expected: no errors. Then start the dev server however this repo does it (check `server/package.json` scripts — likely `npm run dev` or `yarn dev`). Confirm it boots without route registration errors.

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/user.routes.ts
git commit -m "feat(server): wire PATCH /users/chauffeur-availability route"
```

---

## Task 5: Manual server verification (curl)

The server is fully implemented. Before touching mobile, verify every branch of the endpoint by hand. This replaces automated tests (the repo has none) and gives a known-good server baseline for the mobile work.

**Files:** None — this is a verification task.

**Prerequisites:** Dev server running locally. You need three user accounts (or use one account and mutate its state between steps):
- **Admin** user (`role = ADMIN`)
- **Non-onboarded** user (`isDriverOnboarded = false`)
- **Onboarded driver** (`isDriverOnboarded = true`, rates initially null)

For each, obtain a JWT by logging in via the existing auth endpoint. Export them:

```bash
export ADMIN_TOKEN="..."
export NEW_USER_TOKEN="..."
export DRIVER_TOKEN="..."
export BASE_URL="http://localhost:3003/api/v1"
```

- [ ] **Step 1: 401 unauthenticated**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -d '{"isAvailableForChauffeur": true}'
```

Expected: `HTTP/1.1 401`.

- [ ] **Step 2: 403 admin rejected**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"isAvailableForChauffeur": true, "chauffeurHourlyRate": 50}'
```

Expected: `HTTP/1.1 403` with message "Admins cannot update chauffeur availability".

- [ ] **Step 3: 403 not driver-onboarded**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEW_USER_TOKEN" \
  -d '{"isAvailableForChauffeur": true, "chauffeurHourlyRate": 50}'
```

Expected: `HTTP/1.1 403` with message "Complete driver onboarding before offering chauffeur services".

- [ ] **Step 4: 400 enabling availability with no rates**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"isAvailableForChauffeur": true}'
```

Expected: `HTTP/1.1 400` with message "At least one of hourly or daily rate is required to offer chauffeur services".

- [ ] **Step 5: 400 negative rate**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"chauffeurHourlyRate": -10}'
```

Expected: `HTTP/1.1 400`.

- [ ] **Step 6: 400 description too long**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d "{\"chauffeurDescription\": \"$(printf 'x%.0s' {1..501})\"}"
```

Expected: `HTTP/1.1 400`.

- [ ] **Step 7: 200 happy path — opt in with hourly rate**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"isAvailableForChauffeur": true, "chauffeurHourlyRate": 45, "chauffeurDescription": "Experienced, punctual, clean car."}'
```

Expected: `HTTP/1.1 200` with `data.user` containing the new values.

- [ ] **Step 8: 200 merge — toggle off without clearing rates**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"isAvailableForChauffeur": false}'
```

Expected: `HTTP/1.1 200`. Verify in the response that `chauffeurHourlyRate` is still `45` (preserved) and `isAvailableForChauffeur` is now `false`.

- [ ] **Step 9: 200 merge — toggle back on (rates already exist, no rate in payload)**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"isAvailableForChauffeur": true}'
```

Expected: `HTTP/1.1 200` (NOT 400) because the hourly rate still exists in the DB row.

- [ ] **Step 10: 200 explicit null clears a rate**

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"chauffeurHourlyRate": null, "chauffeurDailyRate": 300}'
```

Expected: `HTTP/1.1 200` with response showing `chauffeurHourlyRate: null` and `chauffeurDailyRate: "300"` (Prisma serializes Decimal as string).

- [ ] **Step 11: 400 clearing the only remaining rate while still available**

(User now has `isAvailableForChauffeur: true`, `chauffeurHourlyRate: null`, `chauffeurDailyRate: 300`.)

```bash
curl -i -X PATCH "$BASE_URL/users/chauffeur-availability" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"chauffeurDailyRate": null}'
```

Expected: `HTTP/1.1 400` — the merge-state logic detects that after this update there would be no rates while availability is still on.

- [ ] **Step 12: Verify `/users/profile` response shape**

```bash
curl -s "$BASE_URL/users/profile" \
  -H "Authorization: Bearer $DRIVER_TOKEN" | jq '.data.user | {isAvailableForChauffeur, chauffeurHourlyRate, chauffeurDailyRate, chauffeurDescription}'
```

Expected: all four fields present in the response (confirms Task 1 worked end-to-end).

- [ ] **Step 13: Commit verification notes if anything needed fixing**

If any of steps 1-12 exposed a bug, fix it and commit. Otherwise no commit needed — the server work is verified.

---

## Task 6: Extend mobile `User` type with chauffeur fields

Now the server returns the fields; mobile needs to type them so the profile screen and the new form can read them.

**Files:**
- Modify: `mobile/src/lib/types.ts:1-20`

- [ ] **Step 1: Extend the `User` interface**

Open `mobile/src/lib/types.ts`. Update the `User` interface (currently lines 1-20) to add the four chauffeur fields right after `isDriverOnboarded?: boolean;`:

```typescript
export interface User {
  id: number;
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string | null;
  profileImage: { url: string | null } | null;
  role?: "USER" | "ADMIN";
  status?: "ACTIVE" | "SUSPENDED";
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  isOnboarded?: boolean;
  isPassengerOnboarded?: boolean;
  isDriverOnboarded?: boolean;
  isAvailableForChauffeur?: boolean;
  chauffeurHourlyRate?: string | null;
  chauffeurDailyRate?: string | null;
  chauffeurDescription?: string | null;
  averageRating: number | null;
  totalRatings: number;
  referralCode?: string | null;
  createdAt?: string;
}
```

Note: rates are typed as `string | null` (not `number | null`) because Prisma's `Decimal` type serializes to JSON as a string. This matches the existing `ChauffeurDriverListing` interface in the same file (lines 199-210) which already uses `chauffeurHourlyRate: string | null`.

- [ ] **Step 2: Type-check mobile**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/lib/types.ts
git commit -m "feat(mobile): extend User type with chauffeur availability fields"
```

---

## Task 7: Add `useUpdateChauffeurAvailability` hook

**Files:**
- Modify: `mobile/src/hooks/useChauffeur.ts`

- [ ] **Step 1: Add the hook at the end of the file**

Append to `mobile/src/hooks/useChauffeur.ts` (after `useCompleteChauffeur`):

```typescript
import type { User } from "@/lib/types";

export interface UpdateChauffeurAvailabilityPayload {
  isAvailableForChauffeur?: boolean;
  chauffeurHourlyRate?: number | null;
  chauffeurDailyRate?: number | null;
  chauffeurDescription?: string | null;
}

export function useUpdateChauffeurAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateChauffeurAvailabilityPayload) =>
      api.patch<ApiResponse<{ user: User }>>("/users/chauffeur-availability", data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.user.profile });
      await qc.refetchQueries({ queryKey: queryKeys.user.profile });
    },
  });
}
```

**Important:** The `import type { User }` goes at the top of the file with the other imports — move it there, don't leave it in the middle of the file. The import line `import { ApiResponse, PaginatedResponse, ChauffeurService, ChauffeurDriverListing } from "@/lib/types";` at line 3 should be extended to include `User`:

```typescript
import { ApiResponse, PaginatedResponse, ChauffeurService, ChauffeurDriverListing, User } from "@/lib/types";
```

And drop the separate `import type { User }` line shown above.

Note the payload uses `number | null` (not `string`) because the form will parse decimal input to numbers before sending. The server accepts numbers for Decimal fields.

- [ ] **Step 2: Type-check mobile**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/hooks/useChauffeur.ts
git commit -m "feat(mobile): add useUpdateChauffeurAvailability mutation hook"
```

---

## Task 8: Create the chauffeur availability screen

This is the new form screen — used for both first-time opt-in and later edits. Pattern matches `mobile/src/app/onboarding/driver.tsx`: `SafeAreaView` + `ScreenHeader` + `ScrollView` + `Card` + `Input`s + `Button`, error surfacing via `handleApiError`.

**Files:**
- Create: `mobile/src/app/chauffeur/availability.tsx`

- [ ] **Step 1: Create the file with full contents**

Create `mobile/src/app/chauffeur/availability.tsx`:

```typescript
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";
import { useUpdateChauffeurAvailability } from "@/hooks/useChauffeur";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { handleApiError } from "@/lib/utils";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function ChauffeurAvailabilityScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuthContext();
  const mutation = useUpdateChauffeurAvailability();

  // Redirect users who haven't completed driver onboarding (mirrors server 403)
  useEffect(() => {
    if (user && !user.isDriverOnboarded) {
      Alert.alert(
        "Driver onboarding required",
        "Complete driver onboarding before offering chauffeur services.",
        [{ text: "OK", onPress: () => router.replace("/onboarding/driver") }]
      );
    }
  }, [user, router]);

  // Pre-populate form from current user state
  const initialHourly =
    user?.chauffeurHourlyRate != null ? String(user.chauffeurHourlyRate) : "";
  const initialDaily =
    user?.chauffeurDailyRate != null ? String(user.chauffeurDailyRate) : "";
  const initialDescription = user?.chauffeurDescription ?? "";
  // For first-time opt-in (not yet available), default toggle to on.
  // For editing, reflect the current value.
  const initialAvailable = user?.isAvailableForChauffeur ?? true;

  const [isAvailable, setIsAvailable] = useState(initialAvailable);
  const [hourlyRate, setHourlyRate] = useState(initialHourly);
  const [dailyRate, setDailyRate] = useState(initialDaily);
  const [description, setDescription] = useState(initialDescription);

  const hourlyNum = hourlyRate.trim() === "" ? null : Number(hourlyRate);
  const dailyNum = dailyRate.trim() === "" ? null : Number(dailyRate);

  const hourlyInvalid =
    hourlyRate.trim() !== "" && (!Number.isFinite(hourlyNum as number) || (hourlyNum as number) <= 0);
  const dailyInvalid =
    dailyRate.trim() !== "" && (!Number.isFinite(dailyNum as number) || (dailyNum as number) <= 0);

  const hasAtLeastOneRate = hourlyNum !== null || dailyNum !== null;
  const needsRate = isAvailable && !hasAtLeastOneRate;

  const descriptionTooLong = description.length > 500;

  const canSubmit =
    !hourlyInvalid &&
    !dailyInvalid &&
    !descriptionTooLong &&
    !needsRate &&
    !mutation.isPending;

  async function handleSubmit() {
    if (!canSubmit) return;

    // Build payload. Use explicit null to clear a field that was previously set.
    const payload: {
      isAvailableForChauffeur: boolean;
      chauffeurHourlyRate?: number | null;
      chauffeurDailyRate?: number | null;
      chauffeurDescription?: string | null;
    } = {
      isAvailableForChauffeur: isAvailable,
    };

    // Only include rate/description if the user changed them OR cleared them.
    // Simpler approach: always send them so the server has the final state.
    payload.chauffeurHourlyRate = hourlyNum;
    payload.chauffeurDailyRate = dailyNum;
    payload.chauffeurDescription = description.trim() === "" ? null : description.trim();

    try {
      await mutation.mutateAsync(payload);
      Alert.alert(
        isAvailable ? "You're listed!" : "Availability updated",
        isAvailable
          ? "Clients can now find and hire you as a chauffeur."
          : "Your chauffeur profile is hidden. You can turn it back on any time.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      handleApiError(err, t);
    }
  }

  return (
    <SafeAreaView style={s.container}>
      <ScreenHeader title="Chauffeur Availability" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.heading}>Offer Your Services</Text>
        <Text style={s.subtitle}>
          Set your rates and turn on availability to appear in chauffeur search results.
        </Text>

        <Card style={s.card}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleLabel}>Available for hire</Text>
              <Text style={s.toggleHelp}>
                When on, clients can find and book you.
              </Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          <Input
            label="Hourly Rate (USD)"
            placeholder="e.g. 45"
            keyboardType="decimal-pad"
            value={hourlyRate}
            onChangeText={setHourlyRate}
            error={hourlyInvalid ? "Enter a positive number" : undefined}
          />

          <Input
            label="Daily Rate (USD)"
            placeholder="e.g. 300"
            keyboardType="decimal-pad"
            value={dailyRate}
            onChangeText={setDailyRate}
            error={dailyInvalid ? "Enter a positive number" : undefined}
          />

          {needsRate ? (
            <Text style={s.warning}>Enter at least one rate to offer chauffeur services.</Text>
          ) : null}

          <Input
            label="Description (optional)"
            placeholder="Tell clients about your experience…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            error={descriptionTooLong ? "Maximum 500 characters" : undefined}
          />
          <Text style={s.counter}>{description.length} / 500</Text>
        </Card>

        <Button
          title="Save"
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={!canSubmit}
          style={s.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl },
  heading: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text.primary },
  subtitle: { fontSize: fontSize.md, color: colors.text.secondary, marginBottom: spacing.md },
  card: { gap: spacing.lg },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  toggleLabel: { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  toggleHelp: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  warning: { fontSize: fontSize.sm, color: colors.danger, marginTop: -spacing.sm },
  counter: { fontSize: fontSize.xs, color: colors.text.tertiary, textAlign: "right", marginTop: -spacing.sm },
  submitBtn: { marginTop: spacing.md },
});
```

**Notes:**
- `useAuthContext` is the existing provider at `mobile/src/providers/AuthProvider.tsx` that exposes `user` (backed by `useCurrentUser` via React Query).
- The `Input` component accepts standard `TextInput` props, including `multiline`, `numberOfLines`, and `keyboardType` (see `mobile/src/components/ui/Input.tsx`).
- If the `Input` component doesn't support an `error` prop, fall back to showing the error text in a sibling `<Text>` — check the component signature before relying on the prop. (The explorer confirmed the component exists; if `error` isn't in its props, adapt to whatever the component does support.)
- `colors.danger` is assumed to exist; if not, use `colors.primary` or whatever the theme exposes for error colors — check `mobile/src/lib/theme.ts`.
- The form always sends all three nullable fields on save. This is the simplest correct approach: the server accepts `undefined` / `null` / value, and we always have a known state from the form — so just send it.

- [ ] **Step 2: Type-check**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: no errors. If `colors.danger` or `Input` `error` prop don't exist, fix them per the notes above and re-run.

- [ ] **Step 3: Commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/app/chauffeur/availability.tsx
git commit -m "feat(mobile): add chauffeur availability form screen

Single screen used for both first-time opt-in and later edits.
Client-side validation mirrors the server: at-least-one-rate when
availability is on, positive rates, 500-char description cap."
```

---

## Task 9: Register the new route in the chauffeur stack

**Files:**
- Modify: `mobile/src/app/chauffeur/_layout.tsx`

- [ ] **Step 1: Add the screen**

Open `mobile/src/app/chauffeur/_layout.tsx`. It currently looks like:

```typescript
export default function ChauffeurLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
```

Add `<Stack.Screen name="availability" />` as a sibling:

```typescript
export default function ChauffeurLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="availability" />
    </Stack>
  );
}
```

- [ ] **Step 2: Type-check and smoke-boot the app**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: no errors. Start Metro and confirm the app compiles:

```bash
npx expo start
```

Do not navigate yet — just confirm the bundler doesn't complain about the new route.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/app/chauffeur/_layout.tsx
git commit -m "feat(mobile): register /chauffeur/availability in stack"
```

---

## Task 10: Add profile cards (all three driver/chauffeur states)

Three conditionally-rendered rows in the Services section of `profile.tsx`:
1. `!user.isDriverOnboarded` → "Become a Driver" → `/onboarding/driver`
2. `user.isDriverOnboarded && !user.isAvailableForChauffeur` → "Offer Chauffeur Services" → `/chauffeur/availability`
3. `user.isAvailableForChauffeur` → "Manage Chauffeur Availability" → `/chauffeur/availability`

Only one of the three is visible at a time (they're mutually exclusive by construction, except state 3 also implies state 2's condition is false). The existing "My Chauffeur Services" row (which goes to the browse screen) stays untouched because that's a separate feature (hiring chauffeurs as a client, not being one).

**Files:**
- Modify: `mobile/src/app/(tabs)/profile.tsx`

- [ ] **Step 1: Add the new lucide icons to the import**

In `mobile/src/app/(tabs)/profile.tsx` line 7-10, the import currently is:

```typescript
import {
  UserPen, Car, CreditCard, Key, UserCheck, Globe,
  BellRing, HelpCircle, FileText, LogOut, ChevronRight,
} from "lucide-react-native";
```

Extend it with `IdCard` and `BadgeCheck` (or `Briefcase` — pick whatever fits visually with the existing set; `BadgeCheck` works for the "manage" state, `IdCard` for becoming a driver, and reuse `UserCheck` for "Offer"):

```typescript
import {
  UserPen, Car, CreditCard, Key, UserCheck, Globe,
  BellRing, HelpCircle, FileText, LogOut, ChevronRight,
  IdCard, BadgeCheck,
} from "lucide-react-native";
```

If `IdCard` or `BadgeCheck` aren't in `lucide-react-native`, substitute with any existing icon from the current import — the choice is cosmetic.

- [ ] **Step 2: Add the three conditional rows to the Services section**

Find the Services `<Section>` (currently lines 111-115):

```typescript
<Section title="Services">
  <MenuItem icon={<Key size={20} color={colors.text.secondary} />} label="My Rentals" onPress={() => router.push("/rental" as any)} />
  <View style={s.divider} />
  <MenuItem icon={<UserCheck size={20} color={colors.text.secondary} />} label="My Chauffeur Services" onPress={() => router.push("/chauffeur" as any)} />
</Section>
```

Replace with:

```typescript
<Section title="Services">
  <MenuItem icon={<Key size={20} color={colors.text.secondary} />} label="My Rentals" onPress={() => router.push("/rental" as any)} />
  <View style={s.divider} />
  <MenuItem icon={<UserCheck size={20} color={colors.text.secondary} />} label="My Chauffeur Services" onPress={() => router.push("/chauffeur" as any)} />

  {user && !user.isDriverOnboarded ? (
    <>
      <View style={s.divider} />
      <MenuItem
        icon={<IdCard size={20} color={colors.text.secondary} />}
        label="Become a Driver"
        onPress={() => router.push("/onboarding/driver" as any)}
      />
    </>
  ) : null}

  {user && user.isDriverOnboarded && !user.isAvailableForChauffeur ? (
    <>
      <View style={s.divider} />
      <MenuItem
        icon={<UserCheck size={20} color={colors.text.secondary} />}
        label="Offer Chauffeur Services"
        onPress={() => router.push("/chauffeur/availability" as any)}
      />
    </>
  ) : null}

  {user && user.isAvailableForChauffeur ? (
    <>
      <View style={s.divider} />
      <MenuItem
        icon={<BadgeCheck size={20} color={colors.text.secondary} />}
        label="Manage Chauffeur Availability"
        onPress={() => router.push("/chauffeur/availability" as any)}
      />
    </>
  ) : null}
</Section>
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive/mobile
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/adrianmaenzanise/Projects/Node/your-drive
git add mobile/src/app/\(tabs\)/profile.tsx
git commit -m "feat(mobile): add driver + chauffeur entry points to profile

Three state-aware rows in the Services section:
- Become a Driver (not yet onboarded)
- Offer Chauffeur Services (driver, not yet offering)
- Manage Chauffeur Availability (already offering)"
```

---

## Task 11: End-to-end manual smoke test

Run the full user journey on a real device or simulator. This exercises the mobile + server integration that the curl tests in Task 5 couldn't reach.

**Files:** None.

- [ ] **Step 1: Fresh-user happy path**

Log in as a user with `isDriverOnboarded: false`, `isAvailableForChauffeur: false`. Go to Profile tab → Services section. Confirm **"Become a Driver"** row is visible. Tap it → lands on driver onboarding screen. Complete driver onboarding (license number, experience, front photo). Return to profile. Confirm:
- "Become a Driver" row has disappeared.
- **"Offer Chauffeur Services"** row is now visible.

- [ ] **Step 2: Opt-in happy path**

Tap "Offer Chauffeur Services". On the availability screen:
- Confirm the availability toggle is **on** by default.
- Enter hourly rate `45`. Leave daily rate empty. Enter description "Experienced driver, airport runs."
- Tap Save. Expect success alert. Tap OK → navigates back to profile.
- Confirm profile now shows **"Manage Chauffeur Availability"** (and the "Offer" row has disappeared).

- [ ] **Step 3: Edit happy path**

Tap "Manage Chauffeur Availability". Confirm the form is pre-populated with `45`, empty daily rate, your description, and the toggle **on**. Add daily rate `300`. Tap Save. Expect success alert.

- [ ] **Step 4: Clear a rate**

Re-open availability. Clear the hourly rate field (leave daily at 300). Tap Save. Expect success. Re-open: hourly should be empty, daily still `300`.

- [ ] **Step 5: At-least-one-rate guard (client-side)**

Re-open availability. Clear both rates while toggle is on. Confirm:
- Save button is disabled.
- Warning "Enter at least one rate to offer chauffeur services." appears.

- [ ] **Step 6: Toggle off**

Turn the toggle off (rates still empty is fine now). Save button should enable. Tap Save. Expect success. Re-open: confirm toggle is off, rates preserved (if they were set before you cleared them in step 4 — otherwise just confirm toggle reflects off).

- [ ] **Step 7: Toggle back on with preserved rate**

(If you still have at least one rate from step 3/4.) Turn toggle on. Save. Expect success. This exercises the server's merge-state logic from curl Task 5 Step 9 via the real mobile client.

- [ ] **Step 8: Deep-link gate**

Sign out, create a brand-new account, sign in. Without completing driver onboarding, manually navigate to `/chauffeur/availability` (paste URL into Expo's URL bar, or temporarily add a dev-only button). Expect the redirect alert to fire and route you to `/onboarding/driver`. (This exercises the client-side gate in the screen's `useEffect`.)

- [ ] **Step 9: Server error surfacing**

Stop the dev server (or disconnect network). On the chauffeur availability screen, tap Save. Expect the native `Alert` from `handleApiError` showing a network/error message. Confirm the screen does not navigate away and the form state is preserved.

- [ ] **Step 10: Commit any fixes**

If any step failed, fix the root cause (do not mask symptoms) and commit. If all 9 steps pass, no commit needed.

---

## Self-Review

After finishing Task 11, run these checks against the spec:

**Spec coverage walk-through:**
- Spec "Flow" table — all 3 states → ✅ Task 10.
- Spec "Server > New endpoint" — `PATCH` body shape, `undefined`/`null` semantics → ✅ Tasks 2-4.
- Spec "Server > Validation" — all 5 error cases → ✅ Tasks 2-3, verified in Task 5.
- Spec "Mobile > New screen" — toggle, two rates, description, validation → ✅ Task 8.
- Spec "Mobile > Profile changes" — state-aware rows → ✅ Task 10 (with the documented deviation: three profile rows instead of an edit action on the `/chauffeur` browse screen).
- Spec "Types" — `User` extended → ✅ Task 6.
- Spec "Hook" — `useUpdateChauffeurAvailability` → ✅ Task 7.
- Spec "Edge cases" — deep-link gate, toggle-off preserves rates, first-time opt-in defaults → ✅ Task 8 + Task 11 steps 6, 8.
- Spec "Testing" — server curl matrix, mobile manual QA → ✅ Tasks 5 and 11.

**Spec open items, all resolved inside the plan:**
- Controller file: `user.controller.ts` (Task 3). Rationale: chauffeur availability is ongoing profile state, not one-shot onboarding, so it belongs next to `updateProfile`, not in `onboarding.controller.ts`.
- Router file: `user.routes.ts` (Task 4).
- Validator library: express-validator, confirmed in the repo.
- `/me` response shape: Task 1 adds the four fields to `profileSelects`.
- Test framework: intentionally skipped (zero existing tests, no jest config).
- Error surfacing pattern: `handleApiError` + native `Alert`, matches driver onboarding.
- Numeric input: raw `<Input>` with `keyboardType="decimal-pad"`, matches existing patterns.
- User store: `useAuthContext` backed by `useCurrentUser` React Query, invalidated via `queryKeys.user.profile` in Task 7.

**No placeholders:** every code step has full code. Every command has expected output. Every file path is absolute.

**Type consistency:** `UpdateChauffeurAvailabilityPayload` in Task 7 matches the `matchedData<{...}>` shape in Task 3 and the validator in Task 2 (all four fields, all optional, rates and description nullable). The `User` interface extension in Task 6 uses `string | null` for rates (Prisma Decimal serialization) while the payload uses `number | null` (numbers sent over the wire) — this is intentional and the form does the `String(...)`/`Number(...)` conversions in Task 8.
