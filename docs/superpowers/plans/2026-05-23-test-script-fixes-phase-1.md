# Test Script Fixes — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining FAIL rows from the client's 2026-05-11 test-script review and a handful of small polish items, including wiring the existing pricing engine into the driver post-ride flow and auto-creating a chat thread on ride-request acceptance.

**Architecture:** Two PRs off `feat/test-script-fixes-phase-1`. PR 1A is pure defects (no new UI surfaces). PR 1B adds the avatar picker, inline error display, fare suggestion, and chat-thread creation. Spec: `docs/superpowers/specs/2026-05-23-test-script-fixes-phase-1-design.md`.

**Tech Stack:** React Native + Expo (mobile), Express + Prisma + express-validator (server), TanStack Query.

---

## File Structure

**Modify (mobile):**
- `mobile/src/app/onboarding/driver.tsx` — require back photo (P1)
- `mobile/src/app/profile/edit.tsx` — include DOB in payload + initialize from user + replace "Coming Soon" alert with avatar upload (P2, P10)
- `mobile/src/app/(drawer)/profile.tsx` — render wallet balance + vehicle count (P4)
- `mobile/src/app/vehicle/[id].tsx` — drop `VAN`; swap Alert-based validation for inline errors (P6, P9)
- `mobile/src/app/vehicle/add.tsx` — swap Alert-based validation for inline errors (P9)
- `mobile/src/lib/types.ts` — drop `VAN` from `VehicleCategory` (P6)
- `mobile/src/lib/types.ts` — add `dateOfBirth`, `averageRating`, `totalRatings` to `User` if missing (P2, P3 type-side)
- `mobile/src/app/post-ride/index.tsx` — fare suggestion in `PricingStep` (P11)
- `mobile/src/app/onboarding/driver.tsx` — use new picker helper (P8)
- `mobile/src/app/vehicle/add.tsx` — use new picker helper (P8)

**Create (mobile):**
- `mobile/src/lib/imagePicker.ts` — `pickImageFromSource()` helper (Camera or Gallery) (P8)

**Modify (server):**
- `server/src/types/index.ts` — add `averageRating`, `totalRatings`, `dateOfBirth` to `profileSelects` (P3, P2)
- `server/src/middlewares/validators/vehicle.request.validator.ts` — cross-field MOTORBIKE→capacity=1 validator (P5)
- `server/src/controllers/onboarding.controller.ts` — `uploadDriverLicense` resets REJECTED→PENDING (P7)
- `server/src/controllers/rideRequest.controller.ts` — create `ChatThread` inside `acceptRideRequest` transaction (P12)

**Tests (server):**
- `server/src/middlewares/validators/__tests__/motorbikeCapacity.test.ts` (create) — uses existing `runValidator` pattern (see `passwordRule.test.ts`)
- KYC-reset (Task 8) and chat-thread (Task 16) are controller integration changes; the repo has no supertest harness (per the block comment in `auth.register-referral.test.ts`). These are verified manually until the harness is added as a follow-up.

---

## PR 1A — Defects (P1–P7)

### Task 1: Setup branch

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main
git pull
git checkout -b feat/test-script-fixes-phase-1
```

- [ ] **Step 2: Verify clean tree**

Run: `git status`
Expected: `nothing to commit, working tree clean` (untracked files OK).

---

### Task 2: P1 — Require license back photo

**Files:**
- Modify: `mobile/src/app/onboarding/driver.tsx:90-109, 194-208`

- [ ] **Step 1: Add the back-image guard**

In `mobile/src/app/onboarding/driver.tsx`, after the `!frontImage` guard (around line 90), add:

```tsx
    if (!frontImage) {
      Alert.alert("License image required", "Please upload a photo of the front of your license.");
      return;
    }
    if (!backImage) {
      Alert.alert("License image required", "Please upload a photo of the back of your license.");
      return;
    }
```

- [ ] **Step 2: Make the back upload unconditional**

Replace lines 106-109:

```tsx
      // Step 2: Upload front license image
      await uploadLicenseImage(frontImage, "front");

      // Step 3: Upload back license image
      await uploadLicenseImage(backImage, "back");
```

(Remove the `if (backImage)` wrapper. `backImage` is now non-null thanks to step 1's guard.)

- [ ] **Step 3: Update the UI label**

At line 205, change:

```tsx
                <Text style={s.addImageText}>Upload back of license (optional)</Text>
```

to:

```tsx
                <Text style={s.addImageText}>Upload back of license</Text>
```

Also change the section label at line 194:

```tsx
            <Text style={s.label}>License Photo (Back) *</Text>
```

(Add the `*` to mirror the front label at line 177.)

- [ ] **Step 4: Manually verify**

Run the mobile app. Open driver onboarding. Try to submit with only front photo. Expected: alert "Please upload a photo of the back of your license." Form does not submit.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/onboarding/driver.tsx
git commit -m "fix(driver-onboarding): require license back photo (test 5.2)"
```

---

### Task 3: P2 — Save DOB on profile edit

**Files:**
- Modify: `mobile/src/app/profile/edit.tsx:36-65`
- Modify: `mobile/src/lib/types.ts` (add `dateOfBirth` to `User` if missing)
- Modify: `server/src/types/index.ts:42-88` (add `dateOfBirth: true` to `profileSelects`)

- [ ] **Step 1: Add `dateOfBirth` to `profileSelects` (server)**

In `server/src/types/index.ts`, inside the `profileSelects` object (between lines 42–88), add `dateOfBirth: true,` alongside the other top-level fields. Example placement just below `phoneNumber: true,` on line 55:

```ts
  phoneNumber: true,
  dateOfBirth: true,
  isPhoneVerified: true,
```

- [ ] **Step 2: Update mobile User type if needed**

Open `mobile/src/lib/types.ts`. Find the `User` interface (search for `interface User`). If `dateOfBirth` is missing, add:

```ts
  dateOfBirth?: string | null;
```

If it's already there, skip.

- [ ] **Step 3: Initialize DOB from saved user value**

In `mobile/src/app/profile/edit.tsx`, replace line 39:

```tsx
  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    user?.dateOfBirth ? new Date(user.dateOfBirth) : new Date(1990, 0, 1)
  );
```

- [ ] **Step 4: Include DOB in the save payload**

In `mobile/src/app/profile/edit.tsx`, replace line 55:

```tsx
      await api.post("/users/update", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: dateOfBirth.toISOString(),
      });
```

- [ ] **Step 5: Manually verify**

Run the mobile app. Edit profile. Pick a DOB. Save. Reopen edit profile. Expected: the picker opens at the saved date, not 1990-01-01.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/app/profile/edit.tsx mobile/src/lib/types.ts server/src/types/index.ts
git commit -m "fix(profile): persist date of birth on edit (test 6.6)"
```

---

### Task 4: P3 — Return rating from profileSelects

**Files:**
- Modify: `server/src/types/index.ts:42-88`

- [ ] **Step 1: Add rating fields**

In `server/src/types/index.ts`, inside `profileSelects`, add (placement near `kycStatus`):

```ts
  averageRating: true,
  totalRatings: true,
```

- [ ] **Step 2: Update mobile User type if needed**

In `mobile/src/lib/types.ts`, find `interface User`. Ensure these exist:

```ts
  averageRating?: number | null;
  totalRatings?: number;
```

If missing, add them. If present, skip.

- [ ] **Step 3: Manually verify**

Run the mobile app. Open Profile screen. Expected: star rating renders below name/email (zero stars for a new user; some stars for a rated driver). Previously the `<StarRating>` block was guarded by `user?.averageRating != null` and never showed.

- [ ] **Step 4: Commit**

```bash
git add server/src/types/index.ts mobile/src/lib/types.ts
git commit -m "fix(profile): expose averageRating + totalRatings on /users/profile (test 6.8)"
```

---

### Task 5: P4 — Render wallet balance + vehicle count on profile

**Files:**
- Modify: `mobile/src/app/(drawer)/profile.tsx:200-217` (header section), `406-425` (styles)

- [ ] **Step 1: Check that `formatRwf` exists**

Run: `grep -rn "formatRwf" /Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/lib/ | head -3`
Expected: at least one match. If none, use this fallback inline in the next step: `\`RWF ${(cents/100).toLocaleString()}\``.

- [ ] **Step 2: Add a stats row under the header**

In `mobile/src/app/(drawer)/profile.tsx`, find the header `<View>` ending around line 217 (`</View>` closing `s.header`). Just **after** that closing `</View>`, before the `<Section title="Account">` block, insert:

```tsx
        {/* Stats row */}
        <View style={s.statsRow}>
          <TouchableOpacity
            style={s.statCell}
            onPress={() => router.push("/transactions" as any)}
            activeOpacity={0.7}
          >
            <Text style={s.statValue}>
              {wallet ? formatRwf(wallet.balanceCents) : "—"}
            </Text>
            <Text style={s.statLabel}>Wallet</Text>
          </TouchableOpacity>
          <View style={s.statDivider} />
          <TouchableOpacity
            style={s.statCell}
            onPress={() => router.push("/vehicle" as any)}
            activeOpacity={0.7}
          >
            <Text style={s.statValue}>{myVehicles?.length ?? "—"}</Text>
            <Text style={s.statLabel}>Vehicles</Text>
          </TouchableOpacity>
        </View>
```

- [ ] **Step 3: Add the `formatRwf` import (or fallback)**

At the top of the file with the other imports, add:

```tsx
import { formatRwf } from "@/lib/format";
```

If step 1 found `formatRwf` somewhere else (e.g. `@/lib/utils`), use that path. If no `formatRwf` exists anywhere, replace `formatRwf(wallet.balanceCents)` in step 2 with:

```tsx
`RWF ${Math.round(wallet.balanceCents / 100).toLocaleString()}`
```

…and skip the import.

- [ ] **Step 4: Add the styles**

In the `makeStyles` block at the bottom of the file (around lines 406-425), add:

```tsx
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface ?? colors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: spacing.xs },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.text.tertiary, marginTop: 2 },
```

If `colors.surface` doesn't exist on the palette, remove the `?? colors.background` and just use `colors.background`.

- [ ] **Step 5: Manually verify**

Run the app. Open Profile. Expected: two-cell stats row under the header. Wallet cell shows `—` while loading, then formatted RWF amount. Vehicles cell shows the count. Both are tappable (route to `/transactions` and `/vehicle`).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/app/\(drawer\)/profile.tsx
git commit -m "feat(profile): show wallet balance + vehicle count on header (test 6.1)"
```

---

### Task 6: P5 — Server-side MOTORBIKE capacity validation

**Files:**
- Modify: `server/src/middlewares/validators/vehicle.request.validator.ts:69-103` (VehicleSchema), `216-282` (UpdateVehicleSchema)
- Test: `server/src/middlewares/validators/__tests__/motorbikeCapacity.test.ts` (create)

This test follows the project's existing validator-test pattern (see `server/src/middlewares/validators/__tests__/passwordRule.test.ts`) — direct express-validator invocation with a stubbed `req`. The project does **not** have supertest infrastructure, so we don't mount a full Express app.

- [ ] **Step 1: Write the failing test**

Create `server/src/middlewares/validators/__tests__/motorbikeCapacity.test.ts`:

```ts
import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { validateVehicle, validateUpdateVehicle } from "../vehicle.request.validator";

async function runValidators(validators: any[], body: Record<string, unknown>) {
  const req = {
    body,
    query: {},
    params: {},
    t: (key: string) => key,
  } as unknown as Request;
  for (const v of validators) {
    await (v as any).run(req);
  }
  return validationResult(req)
    .array()
    .map((e) => e.msg as string);
}

const baseCreate = {
  make: "Yamaha",
  model: "MT07",
  color: "Black",
  plateNumber: "RAB123A",
};

describe("vehicle validator — MOTORBIKE capacity rule", () => {
  it("rejects create with MOTORBIKE + capacity > 1", async () => {
    const errors = await runValidators(validateVehicle as any, {
      ...baseCreate,
      capacity: 2,
      category: "MOTORBIKE",
    });
    expect(errors.join(" ")).toMatch(/motorbike.*capacity.*1/i);
  });

  it("accepts create with MOTORBIKE + capacity = 1", async () => {
    const errors = await runValidators(validateVehicle as any, {
      ...baseCreate,
      capacity: 1,
      category: "MOTORBIKE",
    });
    expect(errors.find((m) => /motorbike/i.test(m))).toBeUndefined();
  });

  it("accepts create with CAR + capacity = 4", async () => {
    const errors = await runValidators(validateVehicle as any, {
      ...baseCreate,
      capacity: 4,
      category: "CAR",
    });
    expect(errors.find((m) => /motorbike/i.test(m))).toBeUndefined();
  });

  it("rejects update changing to MOTORBIKE while capacity > 1", async () => {
    const errors = await runValidators(validateUpdateVehicle as any, {
      category: "MOTORBIKE",
      capacity: 4,
    });
    expect(errors.join(" ")).toMatch(/motorbike.*capacity.*1/i);
  });
});
```

Note: this test expects `validateVehicle` and `validateUpdateVehicle` to be **arrays** of validators (an array iterable in the `for...of` loop). Today they are single `checkSchema(...)` calls. Step 4 below converts them to arrays. The test fails today both because the cross-field rule is missing AND because of the array-shape change — both are expected.

- [ ] **Step 2: Run tests, verify they fail**

Run: `cd server && npx jest src/middlewares/validators/__tests__/motorbikeCapacity.test.ts`
Expected: tests fail.

- [ ] **Step 3: Add the cross-field validator helper**

In `server/src/middlewares/validators/vehicle.request.validator.ts`, add to the existing express-validator import at line 1 (it currently imports only `checkSchema, ParamSchema, Schema`):

```ts
import { checkSchema, ParamSchema, Schema, body } from "express-validator";
```

Then, after the existing helper consts (around line 38, before `export const VehicleSchema`), add:

```ts
const motorbikeCapacityRule = body("capacity").custom((value, { req }) => {
  const category = (req as { body: { category?: string } }).body.category;
  if (category === "MOTORBIKE" && Number(value) > 1) {
    throw new Error("Motorbikes must have a capacity of 1");
  }
  return true;
});
```

- [ ] **Step 4: Convert validators to arrays**

Change line 166:

```ts
export const validateVehicle = [checkSchema(VehicleSchema), motorbikeCapacityRule];
```

Change line 289:

```ts
export const validateUpdateVehicle = [checkSchema(UpdateVehicleSchema), motorbikeCapacityRule];
```

Both validators are already consumed via `router.post(... validateVehicle, ...)` style — Express handles arrays-of-middleware natively, so no route file changes.

- [ ] **Step 5: Run tests, verify they pass**

Run: `cd server && npx jest src/middlewares/validators/__tests__/motorbikeCapacity.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 6: TypeScript check**

Run: `cd server && npx tsc --noEmit`
Expected: no errors. Routes that consume `validateVehicle` still work because Express accepts arrays-of-middleware.

- [ ] **Step 7: Commit**

```bash
git add server/src/middlewares/validators/vehicle.request.validator.ts server/src/middlewares/validators/__tests__/motorbikeCapacity.test.ts
git commit -m "fix(vehicle): server-side MOTORBIKE capacity=1 cross-validation"
```

---

### Task 7: P6 — Drop VAN from mobile

**Files:**
- Modify: `mobile/src/app/vehicle/[id].tsx:16`
- Modify: `mobile/src/lib/types.ts:59`

- [ ] **Step 1: Verify no other VAN references exist**

Run:
```bash
grep -rn "VAN" /Users/adrianmaenzanise/Projects/Node/your-drive/mobile/src/ | grep -v node_modules
```
Expected output:
```
mobile/src/app/vehicle/[id].tsx:16:const CATEGORIES: VehicleCategory[] = ["CAR", "MOTORBIKE", "VAN", "BUS"];
mobile/src/lib/types.ts:59:export type VehicleCategory = "CAR" | "MOTORBIKE" | "VAN" | "BUS";
```
If anything else shows up, stop and report — it needs to be addressed before continuing.

- [ ] **Step 2: Drop VAN from the edit-screen category list**

In `mobile/src/app/vehicle/[id].tsx:16`, change:

```tsx
const CATEGORIES: VehicleCategory[] = ["CAR", "MOTORBIKE", "BUS"];
```

- [ ] **Step 3: Drop VAN from the mobile type**

In `mobile/src/lib/types.ts:59`, change:

```ts
export type VehicleCategory = "CAR" | "MOTORBIKE" | "BUS";
```

- [ ] **Step 4: TypeScript check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no new errors. If errors appear citing VAN, they are pre-existing references missed by the grep — fix them.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/vehicle/\[id\].tsx mobile/src/lib/types.ts
git commit -m "fix(vehicle): drop VAN category (not in Prisma enum)"
```

---

### Task 8: P7 — KYC re-upload resets REJECTED → PENDING

**Files:**
- Modify: `server/src/controllers/onboarding.controller.ts:246-402` (`uploadDriverLicense`)

**Test approach:** This is a controller change that requires authenticated multipart upload. The repo has no supertest infrastructure (see the block comment in `server/src/controllers/__tests__/auth.register-referral.test.ts` documenting the blockers: no `app.ts` export, no supertest dependency, no test DB). Standing up that infra is out of scope for this fix. We verify manually against the dev DB; a regression test is filed as a follow-up.

- [ ] **Step 1: Implement the reset**

In `server/src/controllers/onboarding.controller.ts`, inside `uploadDriverLicense`, **immediately after** the `await prisma.licenseImages.upsert({ ... })` block (ends at line 371) and **before** the `if (oldPublicId) {` cleanup (line 374), add:

```ts
    // If the driver had been rejected, reset to PENDING so re-submission
    // re-appears in the admin queue.
    if (user.kycStatus === "REJECTED") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycStatus: "PENDING",
          kycReviewNotes: null,
          kycReviewedAt: null,
        },
      });
    }
```

(`user` is `req.user!` bound on line 248. The string literal `"REJECTED"`/`"PENDING"` matches the `KycStatus` enum — no extra import needed.)

- [ ] **Step 2: Manually verify**

Open `psql` against the dev DB (port 5434 per project convention) and seed a test driver as REJECTED:

```sql
UPDATE "User"
SET "kycStatus" = 'REJECTED', "kycReviewNotes" = 'old reason', "kycReviewedAt" = NOW()
WHERE email = '<your-test-driver-email>';
```

In the mobile app, log in as that driver, go to driver onboarding, re-upload a license image. Then in SQL:

```sql
SELECT id, "kycStatus", "kycReviewNotes", "kycReviewedAt" FROM "User"
WHERE email = '<your-test-driver-email>';
```

Expected: `kycStatus = PENDING`, `kycReviewNotes = NULL`, `kycReviewedAt = NULL`.

Repeat with `kycStatus = APPROVED` to verify approved drivers are not regressed: after re-upload, status should remain `APPROVED`.

- [ ] **Step 3: TypeScript check**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/onboarding.controller.ts
git commit -m "fix(kyc): re-upload of license resets REJECTED -> PENDING"
```

---

### Task 9: Open PR 1A

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin feat/test-script-fixes-phase-1
```

Open a PR titled `fix: test-script phase 1 — defects (5.2, 6.1, 6.6, 6.8, 7.x, KYC reset)` with a body listing each test row closed. Use `gh pr create` per the repo convention.

- [ ] **Step 2: Wait for review + merge before starting PR 1B**

Halt here until PR 1A is merged. PR 1B is built on the same branch (or a new branch off of merged main). Do not interleave 1A and 1B work.

---

## PR 1B — UI additions (P8–P12)

Branch off the merged `main` again (or continue on the same branch if PR 1A wasn't merged separately — the spec allows either).

```bash
git checkout main && git pull
git checkout -b feat/test-script-fixes-phase-1b
```

### Task 10: P8 — Camera-or-gallery image picker helper

**Files:**
- Create: `mobile/src/lib/imagePicker.ts`

- [ ] **Step 1: Create the helper**

Write `mobile/src/lib/imagePicker.ts`:

```ts
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export interface PickedImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

interface PickOptions {
  fallbackName?: string;
  quality?: number;
}

/**
 * Present a two-choice prompt (Camera or Gallery), request the matching
 * permission, and return a normalized PickedImage. Returns null if the user
 * cancels at any step.
 */
export async function pickImageFromSource(opts: PickOptions = {}): Promise<PickedImage | null> {
  const source = await chooseSource();
  if (!source) return null;

  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow camera access to take a photo.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: opts.quality ?? 0.8,
      allowsEditing: false,
    });
    return normalizeResult(result, opts.fallbackName ?? "photo");
  }

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission required", "Please allow access to your photo library.");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: opts.quality ?? 0.8,
    allowsMultipleSelection: false,
  });
  return normalizeResult(result, opts.fallbackName ?? "photo");
}

function chooseSource(): Promise<"camera" | "gallery" | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "Add a photo",
      undefined,
      [
        { text: "Take Photo", onPress: () => resolve("camera") },
        { text: Platform.OS === "ios" ? "Choose from Library" : "Choose from Gallery", onPress: () => resolve("gallery") },
        { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

function normalizeResult(
  result: ImagePicker.ImagePickerResult,
  fallbackName: string
): PickedImage | null {
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return {
    uri: a.uri,
    fileName: a.fileName || `${fallbackName}-${Date.now()}.jpg`,
    mimeType: a.mimeType || "image/jpeg",
  };
}
```

- [ ] **Step 2: TypeScript check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/imagePicker.ts
git commit -m "feat(image-picker): camera + gallery helper"
```

---

### Task 11: P8 — Wire helper into driver license + vehicle photo screens

**Files:**
- Modify: `mobile/src/app/onboarding/driver.tsx:49-69`
- Modify: `mobile/src/app/vehicle/add.tsx:73-126`

- [ ] **Step 1: Replace `pickImage` in driver onboarding**

In `mobile/src/app/onboarding/driver.tsx`, replace the whole `async function pickImage(side: ...)` body (lines 49-69) with:

```tsx
  async function pickImage(side: "front" | "back") {
    const picked = await pickImageFromSource({ fallbackName: `license-${side}` });
    if (!picked) return;
    if (side === "front") setFrontImage(picked);
    else setBackImage(picked);
  }
```

Add the import at the top (with the other `@/...` imports):

```tsx
import { pickImageFromSource } from "@/lib/imagePicker";
```

Remove the now-unused `import * as ImagePicker from "expo-image-picker";` if it's no longer referenced. (The `PickedImage` interface at line 29 also becomes redundant — replace it with `import type { PickedImage } from "@/lib/imagePicker";`.)

- [ ] **Step 2: Replace `handlePickImage` + `pickSingleDoc` in vehicle add**

In `mobile/src/app/vehicle/add.tsx`:

Replace `handlePickImage` (lines 73-102) with:

```tsx
  async function handlePickImage() {
    if (images.length >= MAX_IMAGES) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const picked = await pickImageFromSource({ fallbackName: "vehicle" });
    if (!picked) return;
    setImages((prev) => [...prev, picked].slice(0, MAX_IMAGES));
  }
```

This deliberately switches gallery picking from multi-select to single-pick so both sources behave the same. Users add additional photos by tapping the "+" again until the 4-photo cap is reached.

Replace `pickSingleDoc` (lines 108-126) with:

```tsx
  async function pickSingleDoc(setter: (p: PickedImage | null) => void, fallbackName: string) {
    const picked = await pickImageFromSource({ fallbackName });
    if (!picked) return;
    setter(picked);
  }
```

Add the import:

```tsx
import { pickImageFromSource } from "@/lib/imagePicker";
```

Update the local `PickedImage` interface (lines 28-32) to re-export from the helper for consistency, or leave it — the shape is identical so TS won't complain either way.

- [ ] **Step 3: Manually verify (camera + gallery)**

Run mobile. Open driver onboarding, tap "Upload front of license". Expected: a 3-button alert (Take Photo / Choose from Gallery / Cancel) appears. Each path produces a valid preview. Repeat for vehicle photo + vehicle KYC docs.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/onboarding/driver.tsx mobile/src/app/vehicle/add.tsx
git commit -m "feat(image-picker): use camera-or-gallery helper in license + vehicle screens (test 5.3)"
```

---

### Task 12: P9 — Inline validation errors on vehicle add

**Files:**
- Modify: `mobile/src/app/vehicle/add.tsx`
- Modify: `mobile/src/lib/vehicleValidation.ts`

- [ ] **Step 1: Extend the validator to return a field-keyed error map**

In `mobile/src/lib/vehicleValidation.ts`, **add** (do not remove) a new exported function alongside the existing `validateVehicleForm`:

```ts
export type VehicleFieldErrors = Partial<Record<keyof VehicleFormData, string>>;

export function validateVehicleFields(form: VehicleFormData): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {};
  if (!form.make.trim()) errors.make = "Make is required";
  if (!form.model.trim()) errors.model = "Model is required";
  const yearNum = parseInt(form.year);
  if (!form.year || isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    errors.year = "Valid year is required";
  }
  if (!form.color.trim()) errors.color = "Color is required";
  if (!form.plateNumber.trim()) errors.plateNumber = "License plate is required";
  const capNum = parseInt(form.capacity);
  if (!form.capacity || isNaN(capNum) || capNum < 1 || capNum > 100) {
    errors.capacity = "Valid capacity is required";
  } else if (form.category === "MOTORBIKE" && capNum !== 1) {
    errors.capacity = "Motorbike capacity must be 1";
  }
  if (!form.category) errors.category = "Category is required";
  return errors;
}
```

(Keep `validateVehicleForm` as-is — other callers may still depend on it.)

- [ ] **Step 2: Wire field errors into the add screen**

In `mobile/src/app/vehicle/add.tsx`, add:

Import update:
```tsx
import { VehicleFormData, validateVehicleFields, VehicleFieldErrors } from "@/lib/vehicleValidation";
```

State (alongside the other `useState` calls, e.g. after line 55):
```tsx
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
  const [docErrors, setDocErrors] = useState<{ images?: string; docs?: string }>({});
```

Replace the body of `handleSubmit` (lines 128-182) with:

```tsx
  const handleSubmit = () => {
    const fieldErrors = validateVehicleFields(form);
    const docErr: { images?: string; docs?: string } = {};
    if (images.length === 0) docErr.images = "Please add at least one image of your vehicle.";
    if (!yellowCard || !insurance || !authorization) {
      docErr.docs = "Yellow card, insurance, and authorization are all required.";
    }

    setErrors(fieldErrors);
    setDocErrors(docErr);

    if (Object.keys(fieldErrors).length > 0 || Object.keys(docErr).length > 0) {
      return;
    }

    const formData = new FormData();
    formData.append("make", form.make.trim());
    formData.append("model", form.model.trim());
    formData.append("year", String(parseInt(form.year)));
    formData.append("color", form.color.trim());
    formData.append("plateNumber", form.plateNumber.trim().toUpperCase());
    formData.append("capacity", String(parseInt(form.capacity)));
    formData.append("category", form.category);
    if (transmission) formData.append("transmission", transmission);
    if (fuelType) formData.append("fuelType", fuelType);
    if (tier) formData.append("tier", tier);

    images.forEach((img) => {
      formData.append("images", { uri: img.uri, name: img.fileName, type: img.mimeType } as any);
    });
    formData.append("yellowCard", { uri: yellowCard!.uri, name: yellowCard!.fileName, type: yellowCard!.mimeType } as any);
    formData.append("insurance", { uri: insurance!.uri, name: insurance!.fileName, type: insurance!.mimeType } as any);
    formData.append("authorization", { uri: authorization!.uri, name: authorization!.fileName, type: authorization!.mimeType } as any);

    createVehicle(formData);
  };
```

Pass `error` to each `<Input>`. Example for the Make field (line 189):
```tsx
<Input label="Make" placeholder="e.g. Toyota" value={form.make} onChangeText={set("make")} autoCapitalize="words" error={errors.make} />
```

Repeat for `model`, `year`, `color`, `plateNumber`, `capacity`. Pass `errors.<field>`.

For the Category section (lines 204-224), under the `<View style={s.categoryRow}>` block, just before `</View>` of `s.section`, add:

```tsx
            {errors.category && (
              <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
                {errors.category}
              </Text>
            )}
```

For the images section (around line 249) and the docs section (around line 270), append inside each `<View style={s.section}>` near the bottom:

```tsx
          {docErrors.images && (
            <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
              {docErrors.images}
            </Text>
          )}
```

…and:

```tsx
          {docErrors.docs && (
            <Text style={{ color: colors.error, fontSize: fontSize.xs, marginTop: 4 }}>
              {docErrors.docs}
            </Text>
          )}
```

- [ ] **Step 3: Clear errors as fields change**

Update the `set` helper at line 69:

```tsx
  const set = (field: keyof VehicleFormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
```

- [ ] **Step 4: Manually verify**

Run the app. Open Add Vehicle. Hit Submit on an empty form. Expected: each required field shows a red error message directly beneath it. No top-level alert. Type in the Make field — its error clears.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/vehicle/add.tsx mobile/src/lib/vehicleValidation.ts
git commit -m "feat(vehicle): inline per-field validation errors on add screen (test 7.3)"
```

---

### Task 13: P9 — Inline validation errors on vehicle edit

**Files:**
- Modify: `mobile/src/app/vehicle/[id].tsx`

- [ ] **Step 1: Add field errors state and validator call**

In `mobile/src/app/vehicle/[id].tsx`:

Import update (line 14):
```tsx
import { VehicleFormData, validateVehicleFields, VehicleFieldErrors } from "@/lib/vehicleValidation";
```

State (after line 43):
```tsx
  const [errors, setErrors] = useState<VehicleFieldErrors>({});
```

Replace `handleSave` (lines 86-113):

```tsx
  const handleSave = () => {
    if (!id) return;
    const fieldErrors = validateVehicleFields(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    updateVehicle(
      {
        id,
        data: {
          make: form.make.trim(),
          model: form.model.trim(),
          year: parseInt(form.year),
          color: form.color.trim(),
          plateNumber: form.plateNumber.trim().toUpperCase(),
          capacity: parseInt(form.capacity),
          category: form.category,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => {
          const msg = err?.response?.data?.message ?? "Failed to update vehicle.";
          Alert.alert("Error", msg);
        },
      }
    );
  };
```

- [ ] **Step 2: Pass `error` to each Input**

Same pattern as Task 12 step 2. For each `<Input>` from lines 186-202 (Make, Model, Year, Color, License Plate, Capacity), add `error={errors.<field>}`.

For the category section (lines 202-221), add the same `{errors.category && <Text>...</Text>}` block from Task 12.

- [ ] **Step 3: Clear errors on change**

Update the `set` helper at line 78:

```tsx
  const set = (field: keyof VehicleFormData) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };
```

- [ ] **Step 4: Manually verify**

Run. Edit an existing vehicle. Clear the Make field, hit Save. Expected: inline red error under the field; no alert.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/app/vehicle/\[id\].tsx
git commit -m "feat(vehicle): inline per-field validation errors on edit screen (test 7.3)"
```

---

### Task 14: P10 — Profile photo upload

**Files:**
- Modify: `mobile/src/app/profile/edit.tsx:74-88`
- No server change needed (`POST /onboarding/profile-image` exists; see `server/src/routes/onboarding.routes.ts:28` and `server/src/controllers/onboarding.controller.ts:27-96`).

- [ ] **Step 1: Verify the endpoint contract**

Run:
```bash
grep -n "profile-image" /Users/adrianmaenzanise/Projects/Node/your-drive/server/src/routes/onboarding.routes.ts
```
Expected: `28:router.post("/profile-image", uploadImage.single("image"), updateProfileImage);`

The multipart field name is `image`. Endpoint is `POST /users/onboarding/profile-image` (mounted under `/users/onboarding`).

- [ ] **Step 2: Wire avatar upload into edit.tsx**

Replace lines 82-87 in `mobile/src/app/profile/edit.tsx`:

```tsx
            <TouchableOpacity
              onPress={handleChangePhoto}
              style={s.changePhotoBtn}
              disabled={isUploadingPhoto}
            >
              <Text style={s.changePhotoText}>
                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
              </Text>
            </TouchableOpacity>
```

Add state alongside the other `useState` calls (after line 41):

```tsx
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
```

Add the handler before the return (after `handleSave`, around line 65):

```tsx
  async function handleChangePhoto() {
    const picked = await pickImageFromSource({ fallbackName: "avatar" });
    if (!picked) return;
    setIsUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("image", { uri: picked.uri, name: picked.fileName, type: picked.mimeType } as any);
      await api.upload("/users/onboarding/profile-image", fd);
      await queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    } catch (err) {
      handleApiError(err, t);
    } finally {
      setIsUploadingPhoto(false);
    }
  }
```

Add the imports at the top of the file:

```tsx
import { pickImageFromSource } from "@/lib/imagePicker";
```

- [ ] **Step 3: Manually verify**

Run the app. Open Edit Profile. Tap "Change Photo". Expected: the camera/gallery alert appears (from Task 10 helper). Pick a photo. Avatar updates. Reopen Edit Profile — avatar persists.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/profile/edit.tsx
git commit -m "feat(profile): avatar upload via camera or gallery (test 6.7)"
```

---

### Task 15: P11 — Driver post-ride fare suggestion

**Files:**
- Modify: `mobile/src/app/post-ride/index.tsx` (`PricingStep`, form initial state, step 0→3 wiring)

- [ ] **Step 1: Add a `priceEdited` flag**

In `mobile/src/app/post-ride/index.tsx`, after the existing `const [form, setForm] = useState<FormData>(initialForm);` (line 63), add:

```tsx
  const [priceEdited, setPriceEdited] = useState(false);
```

- [ ] **Step 2: Compute distance/duration from origin + destination**

Inside the `PostRideScreen` component (after the `useState` block around line 63), add:

```tsx
  const distanceKm = useMemo(() => {
    if (!form.originLocation || !form.destinationLocation) return 0;
    return haversineKm(
      { lat: form.originLocation.latitude, lng: form.originLocation.longitude },
      { lat: form.destinationLocation.latitude, lng: form.destinationLocation.longitude }
    );
  }, [form.originLocation, form.destinationLocation]);

  const durationMin = useMemo(() => durationMinFromKm(distanceKm), [distanceKm]);

  const selectedVehicle = useMemo(
    () => (vehicles ?? []).find((v) => String(v.id) === form.vehicleId),
    [vehicles, form.vehicleId]
  );

  const fareInput = useMemo(() => {
    if (distanceKm <= 0 || !selectedVehicle) return null;
    return {
      vehicleCategory: selectedVehicle.category as "CAR" | "MOTORBIKE" | "BUS",
      rideType: "P2P" as const, // posted rides default to P2P server-side
      distanceKm,
      durationMin,
    };
  }, [distanceKm, durationMin, selectedVehicle]);

  const { data: fareData } = useFareEstimate(fareInput);
  const suggestedFare = fareData?.data?.suggestedFare ?? null;
```

Add the imports at the top:

```tsx
import { useFareEstimate, haversineKm, durationMinFromKm } from "@/hooks/useFareEstimate";
```

- [ ] **Step 3: Auto-fill the contribution field**

In the `useEffect` section near the top (after the existing onboarding redirect effect around line 70-74), add:

```tsx
  useEffect(() => {
    if (!priceEdited && suggestedFare != null) {
      setForm((prev) => ({ ...prev, contribution: String(suggestedFare) }));
    }
  }, [suggestedFare, priceEdited]);
```

- [ ] **Step 4: Mark priceEdited when the user types**

Change the `PricingStep` signature to accept the flag setter:

```tsx
function PricingStep({
  form,
  update,
  colors,
  styles: ps,
  onPriceTouch,
  suggested,
  distanceKm,
  durationMin,
}: {
  form: FormData;
  update: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
  onPriceTouch: () => void;
  suggested: number | null;
  distanceKm: number;
  durationMin: number;
}) {
```

In the `<Field>` for contribution (around line 444-451), wrap the `onChangeText`:

```tsx
        onChangeText={(v) => {
          onPriceTouch();
          update("contribution", v);
        }}
```

Just after the `<Field>` and before `<Text style={ps.fieldLabel}>Booking Type</Text>` (around line 453), add:

```tsx
      {suggested != null && distanceKm > 0 && (
        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
          Suggested: RWF {suggested.toLocaleString()} based on {distanceKm.toFixed(1)} km · {durationMin} min
        </Text>
      )}
```

Update the caller (around line 230) to pass the new props:

```tsx
        {step === 3 && (
          <View testID="postRide.step.3">
            <PricingStep
              form={form}
              update={update}
              colors={colors}
              styles={ps}
              onPriceTouch={() => setPriceEdited(true)}
              suggested={suggestedFare}
              distanceKm={distanceKm}
              durationMin={durationMin}
            />
          </View>
        )}
```

- [ ] **Step 5: Seed a PricingSettings row for manual verification**

Run:
```bash
cd server && npx prisma studio
```
Open `PricingSettings`. Confirm at least one active row exists for `(vehicleCategory: CAR, rideType: P2P)`. If not, create one with `baseFare: 500, perKm: 200, perMinute: 50, minimumFare: 1000, currency: RWF, isActive: true`.

- [ ] **Step 6: Manually verify**

Run the app. Open Post a Ride. Pick an origin and destination ~3 km apart. Select a CAR vehicle. Reach Step 4 (Pricing). Expected: contribution field is pre-filled with a suggested fare; subdued line below it reads `Suggested: RWF X,XXX based on 3.X km · X min`. Edit the value — the suggestion line stays but the field stops auto-updating.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/app/post-ride/index.tsx
git commit -m "feat(post-ride): suggest fare from pricing settings (test/UX)"
```

---

### Task 16: P12 — Auto-create chat thread on ride request accept

**Files:**
- Modify: `server/src/controllers/rideRequest.controller.ts:1009-1072`

**Test approach:** Same constraint as Task 8 — no supertest harness in the repo. We verify manually with two devices.

- [ ] **Step 1: Add thread creation to the transaction**

In `server/src/controllers/rideRequest.controller.ts`, inside `acceptRideRequest`'s `prisma.$transaction` callback. After the `tx.notification.create({ ... })` block (line 1069) and before the `return { ride: createdRide, booking: createdBooking };` line (line 1071), add:

```ts
        // Auto-create a chat thread so the passenger's Chat CTA works
        // immediately after acceptance. The unique (rideId) constraint on
        // ChatThread (schema.prisma:705) means a duplicate is impossible if
        // the same ride is somehow accepted twice; but we guard anyway.
        const existingThread = await tx.chatThread.findUnique({
          where: { rideId: createdRide.id },
        });
        if (!existingThread) {
          await tx.chatThread.create({
            data: {
              rideId: createdRide.id,
              ownerId: driver.id,
              users: {
                connect: [{ id: driver.id }, { id: rr.userId }],
              },
            },
          });
        }
```

- [ ] **Step 2: TypeScript check**

Run: `cd server && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification with two devices**

Open mobile as Passenger A. Submit a ride request. On a second device, log in as Driver B (APPROVED KYC, has a vehicle, ride-request availability ON). Accept the request from the Live Ride Requests screen. On Passenger A's device, open the ride-request detail. Expected: "Chat" button now opens a real thread (the message list, not the "Chat will be available shortly" fallback).

Verify in SQL:
```sql
SELECT id, "rideId", "ownerId" FROM "ChatThread" WHERE "rideId" = <createdRideId>;
SELECT t."A" AS thread_id, u.id, u."firstName" FROM "_UsersOnThreads" t
JOIN "User" u ON u.id = t."B"
WHERE t."A" = <thread_id>;
```
Expected: thread exists, both passenger and driver are members.

- [ ] **Step 4: Spot-check the booking-accept path**

Run:
```bash
grep -n "ChatThread\|chatThread" /Users/adrianmaenzanise/Projects/Node/your-drive/server/src/controllers/booking.controller.ts
```
If `booking.controller.ts`'s approval handler doesn't already create a thread, file a follow-up note in the PR description ("booking-accept may have the same gap; out of scope here"). Do not fix it in this task — the spec explicitly limits scope to `acceptRideRequest`.

- [ ] **Step 5: Commit**

```bash
git add server/src/controllers/rideRequest.controller.ts
git commit -m "feat(ride-request): auto-create chat thread on accept"
```

---

### Task 17: Open PR 1B

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin feat/test-script-fixes-phase-1b
```

Open a PR titled `feat: test-script phase 1B — UI additions (avatar, inline errors, fare suggestion, chat thread)`. Reference the spec and PR 1A in the body.

---

## Self-Review Checklist (for the plan author)

Run this once before handing the plan to the executor:

- Every spec item P1–P12 maps to a task: P1→T2, P2→T3, P3→T4, P4→T5, P5→T6, P6→T7, P7→T8, P8→T10/T11, P9→T12/T13, P10→T14, P11→T15, P12→T16.
- No "TBD" or "implement later".
- Type used in T11/T14 (`PickedImage`) matches helper definition in T10.
- Field names match between client and server (`dateOfBirth`, multipart field `image` for avatar, `kycStatus` literals).
- Endpoint paths match between client and server (`/users/update`, `/users/onboarding/profile-image`).
- Phase 2 items (bidding, pin-on-map for driver post-ride) are explicitly out of scope and not referenced as deps.
