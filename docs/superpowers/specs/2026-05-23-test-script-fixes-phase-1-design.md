# Test Script Fixes — Phase 1 Design

**Status:** Draft for review
**Date:** 2026-05-23
**Branch:** `feat/test-script-fixes-phase-1`
**Source of feedback:** Client review of test-script run on 2026-05-11 (`docs/mobile app test script.pdf`), cross-checked against current `main` (last merge `1f1055f feat/tier-1-2-metadata`).

## Background

The client tested the YourDrive mobile app against the agreed test script and returned a mixed list of FAIL rows, soft polish notes, and a couple of larger feature requests. Since that review, three areas have moved without an explicit spec: the `PricingSettings` engine + admin tab (`feat/kyc-and-pricing`, PR #17), the pin-on-map passenger picker (`feat/location-picker`, PR #13 family), and the lifting of fixed-city location constraints (now derived from Google Places `address_components` via `extractCity()`).

This spec closes the remaining items that are small, defect-shaped, and do not need a separate design pass. The one larger item the client raised — driver counter-offer / bidding — is **deferred to Phase 2** and will get its own spec.

## Goals

1. Close every FAIL row from the 2026-05-11 review whose cause is in our code, plus the two cross-cutting polish notes the client called out (inline validation errors, camera as an image source).
2. Surface the existing `PricingSettings` engine to the driver's post-ride contribution step so "the system suggests a price" works on both sides of the marketplace.
3. Eliminate the one client-server mismatch we found while triaging (mobile offers `VAN` in vehicle edit; Prisma enum is `CAR | MOTORBIKE | BUS`).
4. Make the chat CTA functional after a driver accepts a ride request (today it falls back to "Chat will be available shortly" because no thread is created).

## Non-goals

- **Bidding / driver counter-offer.** Separate Phase 2 spec.
- **Pin-on-map for driver post-ride.** Passenger ride-request already has it (`MapPinController` + `useReverseGeocode`); driver post-ride continues to use `LocationPicker` autocomplete. Out of scope unless the client raises it again.
- **Pricing engine sophistication** (surge, time-of-day). The current `PricingSettings` row (`baseFare + perKm·d + perMinute·t`, clamped to `minimumFare`, per `(vehicleCategory, rideType)`) is what we wire in.
- **Live driver tracking, payment gateway, emergency button, growth engine** — already declined in `docs/client-feedback-response.txt` as out-of-contract.
- **6.7 phone-re-verification on phone number change** — the test row says "if re-verification is required". Phone verification flow already exists; we don't introduce a new trigger here.
- Maestro flows. Existing flows continue to run; new flows are nice-to-have but not gating.

## Approach

A single feature branch `feat/test-script-fixes-phase-1` off `main`. Items are independent enough to ship in **two PRs**:

- **PR 1A — Defects.** Items P1–P7. Pure bug-fix work, low risk, no UI invention.
- **PR 1B — UI additions.** Items P8–P12. Camera image-picker helper, inline-error sweep on vehicle forms, avatar upload, driver-side fare suggestion, chat-thread auto-create. Adds new code paths and one new screen surface (avatar picker sheet).

1B does not merge until 1A is merged. The split keeps each PR reviewable and lets the QA team re-run the failed test rows against 1A in isolation if 1B slips.

Commit convention follows existing repo style: `fix(scope): …`, `feat(scope): …`.

## Item inventory

| ID | Item | Test row | PR |
|---|---|---|---|
| P1 | License back photo required | 5.2 | 1A |
| P2 | DOB included in profile-update payload | 6.6 | 1A |
| P3 | `averageRating` / `totalRatings` returned by `profileSelects` | 6.8 | 1A |
| P4 | Wallet balance + vehicle count rendered on profile | 6.1 | 1A |
| P5 | Server-side cross-validation: MOTORBIKE → capacity = 1 | 7.x | 1A |
| P6 | VAN reconciliation | 7.4 | 1A |
| P7 | KYC re-upload resets REJECTED → PENDING | 5.6 follow-up | 1A |
| P8 | Camera as image-picker source (license, vehicle photos, avatar) | 5.3 | 1B |
| P9 | Inline validation errors in vehicle add/edit forms | 7.3 | 1B |
| P10 | Profile photo upload (replaces "Coming Soon") | 6.7 | 1B |
| P11 | Driver post-ride fare suggestion via `/public/fare-estimate` | new | 1B |
| P12 | Chat thread auto-created on `acceptRideRequest` | new | 1B |

## P1 — License back photo required

**Today.** `mobile/src/app/onboarding/driver.tsx:81-109`. Front photo blocks submission (`!frontImage` returns early at line 90). Back photo is uploaded only if present (`if (backImage)` at line 107). UI label at line 205 says "Upload back of license (optional)".

**Change.**
- Mobile: drop the conditional. After the existing `!frontImage` guard (line 90), add a symmetric `!backImage` guard returning the same alert pattern. Remove `(optional)` from the label at line 205. The label section header at line 194 stays.
- Server: `uploadDriverLicense` already accepts a `side=back` upload; no change needed.

No new endpoint, no schema change.

## P2 — DOB included in profile-update payload

**Today.** `mobile/src/app/profile/edit.tsx:55`. `handleSave` POSTs `{ firstName, lastName, phoneNumber }` to `/users/update`. The DOB state (`dateOfBirth`, `setDateOfBirth`) is captured from the date picker but never included. The server-side validator (`server/src/middlewares/validators/user.request.validator.ts:48-52`) and the controller (`server/src/controllers/user.controller.ts:131`) both already accept `dateOfBirth` as ISO8601.

**Change.**
- Include `dateOfBirth: dateOfBirth.toISOString()` in the POST body. The server validator runs `.toDate()` on the ISO string.
- Initialize `dateOfBirth` from `user?.dateOfBirth` instead of the hard-coded `new Date(1990, 0, 1)` on line 39, so the picker opens at the saved value rather than 1990. If `user.dateOfBirth` is null, fall back to the current default.
- Add `dateOfBirth: true` to `profileSelects` so `useAuthContext().user` carries it.

No schema change; column already exists on `User`.

## P3 — Rating returned by `profileSelects`

**Today.** `server/src/types/index.ts:42` lists every field returned for the authenticated user. `averageRating` and `totalRatings` are not in the select. Mobile (`profile.tsx:210-212`) already renders the rating conditionally (`user?.averageRating != null`), so the UI is wired — the data just isn't there.

**Change.**
- Add `averageRating: true` and `totalRatings: true` to `profileSelects`. The fields exist on the `User` model (other controllers, e.g. `rental.controller.ts`, already select them).
- No mobile change. The conditional in `profile.tsx:210-212` becomes truthy and the existing `<StarRating>` renders.

## P4 — Wallet balance + vehicle count on profile

**Today.** `mobile/src/app/(drawer)/profile.tsx` already calls `useMyWallet()` (line 67) and `useMyVehicles()` (line 71), but neither value is rendered on the profile header. Both hooks are used elsewhere (the "go online" modal at lines 102-138), so the data path is already validated.

**Change.**
- Add a two-cell row under the avatar/name section: **Wallet** (formatted via `formatRwf`) on the left, **Vehicles** count on the right. Both cells are display-only (taps route to existing screens: `/wallet` and `/vehicles` respectively).
- If the wallet query is still loading, show a `—` placeholder rather than `0` to avoid a flash of zero.
- No new endpoints.

## P5 — Server-side capacity cross-validation

**Today.** Mobile enforces MOTORBIKE → capacity = 1 (`mobile/src/lib/vehicleValidation.ts:21`, plus a UI auto-set + disable on category change at `vehicle/add.tsx:212-216` and `vehicle/[id].tsx:209-213`). Server (`server/src/middlewares/validators/vehicle.request.validator.ts:216-282`) validates each field in isolation; a payload that lies (e.g. directly hitting the API) is accepted.

**Change.**
- Add a `.custom(...)` step on the update and create validators that rejects payloads where `category === "MOTORBIKE"` and `capacity > 1`. Error message mirrors the client-side text: "Motorbikes must have a capacity of 1."
- Keep the mobile auto-set behaviour — it's good UX.

## P6 — VAN reconciliation

**Today.** Prisma enum (`schema.prisma:290-294`) is `CAR | MOTORBIKE | BUS`. Mobile add screen (`vehicle/add.tsx`) does **not** offer VAN. Mobile edit screen (`vehicle/[id].tsx:16`) does: `const CATEGORIES: VehicleCategory[] = ["CAR", "MOTORBIKE", "VAN", "BUS"]`. Saving a vehicle with category VAN would be rejected by Prisma.

**Decision: remove VAN from the mobile edit screen.** Rationale: the contract-scope vehicle types are car, motorbike, and bus; adding VAN to the enum would cascade into pricing settings, matchers, vehicle filters, and admin. If the client later wants vans, we add them as a single coordinated change.

**Change.**
- `vehicle/[id].tsx:16`: drop `"VAN"` from `CATEGORIES`.
- Verify no other mobile file references `"VAN"` (grep at implementation time).

## P7 — KYC re-upload resets REJECTED to PENDING

**Today.** `server/src/controllers/onboarding.controller.ts:246-402` (`uploadDriverLicense`) upserts the license image but does not touch `kycStatus`. A rejected driver who re-uploads stays REJECTED until an admin manually clicks Approve — there's no signal in the admin queue that a re-submission happened.

**Change.**
- After the upsert, if the user's current `kycStatus === "REJECTED"`, set it back to `PENDING` and clear `kycReviewNotes` and `kycReviewedAt`. Same transaction.
- This affects the admin queue: re-submissions reappear as PENDING, which is what we want.
- Mobile profile banner (`profile.tsx:269-290`) already handles all three states; no mobile change.

## P8 — Camera as image-picker source

**Today.** Every image-picker call uses `ImagePicker.launchImageLibraryAsync(...)` — gallery only. Affects: license front/back (`onboarding/driver.tsx:55`), vehicle photos (`vehicle/add.tsx`, `vehicle/[id].tsx`), and the new avatar picker (P10).

**Change.**
- Introduce a small helper `mobile/src/lib/imagePicker.ts` exporting `pickImageFromSource()` that presents an `ActionSheet`-style two-option prompt (Camera, Gallery) — implemented with `Alert.alert` for cross-platform simplicity, two buttons + cancel. Permissions requested per source.
- Replace direct `launchImageLibraryAsync` calls in the three screens above with this helper.
- The helper returns the same `PickedImage` shape `onboarding/driver.tsx` uses, so callsites stay short.

## P9 — Inline validation errors on vehicle forms

**Today.** `mobile/src/components/ui/Input.tsx:39, 68` already supports inline error text below the field (red, small font). Vehicle add (`vehicle/add.tsx`) and edit (`vehicle/[id].tsx`) currently raise validation through `Alert.alert` at the top (`add.tsx:131, 139-142`; `[id].tsx:89, 119`).

**Change.**
- Lift each form's validation into a small `validate()` function returning `{ field: errorMessage }`. Store in component state as `errors`.
- Pass `error={errors.field}` to each `<Input>`. Where the form uses non-Input controls (category chips, image uploads), render an inline `<Text style={...}>` underneath the control.
- On submit: run `validate()`, set errors, return early if any. Replace the existing `Alert.alert` validation paths. On API error (server-side validation), keep the existing `handleApiError(err, t)` toast.
- Scope: vehicle add + vehicle edit. Profile edit and driver onboarding stay as-is (out of test-row scope; can be a follow-up).

## P10 — Profile photo upload

**Today.** `mobile/src/app/profile/edit.tsx:82-87` is a `TouchableOpacity` that fires `Alert.alert("Coming Soon", ...)`. The user model has a `profileImage` relation (already selected by `profileSelects`, shown in the `Avatar` component).

**Change.**
- **Mobile.** Replace the alert with `pickImageFromSource()` (P8 helper) → `api.upload("/users/avatar", formData)` → invalidate the user-profile query. Show a small spinner overlay on the avatar while uploading. Use the existing `Avatar` component's `imageUrl` prop to render the result.
- **Server.** Add `POST /users/avatar` (multipart) handler. Reuses the existing image-upload pipeline (the same `multer`/storage path used by license and vehicle photos). Creates/updates a `ProfileImage` row linked to the user; deletes the old file/row if present.
- The `(drawer)/profile.tsx:146` "Coming Soon" alert is on a separate button — leave it alone; this spec only addresses the edit-profile avatar.

## P11 — Driver post-ride fare suggestion

**Today.** `useFareEstimate` (`mobile/src/hooks/useFareEstimate.ts`) calls `/public/fare-estimate?vehicleCategory=…&rideType=…&distanceKm=…&durationMin=…` and returns `{ suggestedFare, breakdown }`. Passenger ride-request uses it (`HomeBottomSheet.tsx:60-83`) with a "sticky-edit" flag so the suggestion stops auto-updating once the user types a value. Driver post-ride (`mobile/src/app/post-ride/index.tsx`, `PricingStep`) presents a free-form contribution input with no suggestion.

**Change.**
- Compute distance + duration on Step 1 → Step 4 transition using the same haversine + 2-min/km approach `useFareEstimate` already encapsulates. Origin/destination coordinates are available from the route step's `LocationPicker` selection.
- In `PricingStep`, call `useFareEstimate({ vehicleCategory: selectedVehicle.category, rideType: "D2D" or "P2P", distanceKm, durationMin })`.
- Pre-fill the price field with `suggestedFare`. Apply the same `priceEdited` sticky-edit pattern as `HomeBottomSheet` so the driver's manual entry isn't overwritten.
- Render a small subdued line under the field: `Suggested: RWF X,XXX based on X km · X min`.
- `rideType` value: the post-ride flow already distinguishes D2D vs P2P (it's part of the ride model). Read from the form's existing state.
- If `useFareEstimate` returns `null` / errors (no active `PricingSettings` row for the category/type), leave the field empty and skip the subdued line. No crash, no alert.

## P12 — Chat thread auto-created on accept

**Today.** `server/src/controllers/rideRequest.controller.ts:1009-1072` (`acceptRideRequest`) runs a transaction that creates the ride, the booking, and a notification. It does not create a `ChatThread`. Mobile (`ride-request/[id].tsx:150-163`) tries to find a thread via `useChatThreadByRideId()`; when none exists, the Chat button shows the fallback "Chat will be available shortly". This affects ride-request acceptance specifically — chat threads on posted rides (driver's published ride being booked) follow a different code path and should be re-verified during implementation.

**Change.**
- Inside the existing `prisma.$transaction` in `acceptRideRequest`, create a `ChatThread` with the two participants (passenger + accepting driver) and link `rideId`. Idempotent guard: if a thread already exists for the `(rideId, participants)` combination, reuse it.
- The mobile hook `useChatThreadByRideId()` already finds threads by `rideId`; no mobile change required for the CTA to start working.
- Notifications: leave the existing accept-notification as-is. A separate "thread created" notification would be noise.
- Re-verify the booking-accept path (driver approves a passenger's booking on a published ride) and replicate this pattern there if it has the same gap. If it doesn't, note that in the PR and move on.

## Data model changes

- None. All work uses existing models (`User`, `ProfileImage`, `ChatThread`, `PricingSettings`).

## Migration risk

- P3 (rating in `profileSelects`): backward-compatible additive change.
- P6 (drop VAN from mobile): no migration. Any vehicle currently saved as VAN would already be rejected by the server, so the data simply does not exist.
- P7 (KYC re-upload reset): one-time effect of unlocking REJECTED users who re-upload after the deploy. Acceptable.

## Test plan

- **P1, P5, P6:** Jest tests on the server validators where they exist; otherwise integration test via supertest hitting the endpoint with bad payloads.
- **P2, P3, P4, P10:** manual test against the test script rows (6.6, 6.8, 6.1, 6.7). The point of this whole bundle is closing those rows.
- **P7:** integration test against `POST /onboarding/driver/license?side=front` with a user seeded as `kycStatus=REJECTED`; assert it flips to PENDING.
- **P8, P9:** manual UI verification.
- **P11:** manually verify the suggestion appears at PricingStep with a known `PricingSettings` row in the seed, and that the sticky-edit pattern prevents the suggestion from overwriting a manually-typed value. No new automated test — the underlying endpoint already has server-side coverage.
- **P12:** integration test on `acceptRideRequest`: after accept, query for a `ChatThread` with the expected `rideId` and participants.

## Open questions

None for Phase 1 itself. Phase 2 (bidding) has its own design questions and gets its own spec.

## Phase 2 backlog (for visibility)

- Driver counter-offer on a passenger ride request (`RideBid` model, accept/decline/counter-back, expiry, multi-driver handling). The client's framing was specifically: "when a driver sees a ride request, they can counter-offer."
- Pin-on-map for driver post-ride flow, only if the client raises it.
