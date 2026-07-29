# A6 — Referral Persistence Trace

**Date:** 2026-05-11
**Task:** Plan slice A, Task 4 (A6) — trace register controller referral handling
**Branch:** feat/qat-slice-a

## TL;DR

The register controller **already persists referrals correctly**. There is no missing-persistence bug. The referral is stored as a normalized `Referral` row (with `inviterId` + `inviteeId`), not as a `referredById` foreign key on the `User` model. Plan Task 13's assertion target (`referredById` on the new user) does **not** exist in the schema and would require a (probably unnecessary) migration.

**Recommended fix scope: NO CODE CHANGE REQUIRED.** Task 13 should reframe its assertion to check the `Referral` table instead of a non-existent `User.referredById` field. See "Recommendation for Task 13" below.

## File and line numbers

- Route: `server/src/routes/auth.routes.ts:18-19`
  ```ts
  .route("/register")
  .post(authValidator.registerRequestBodyValidator, validateRequestBody, AuthController.register);
  ```
- Handler: `server/src/controllers/auth.controller.ts:134-321` (`AuthController.register`)
- Validator: `server/src/middlewares/validators/auth.request.validator.ts:23-73` (`registerRequestBodyValidator`)
  - `referralCode` is validated as a **query** param at lines 57-61:
    ```ts
    query("referralCode")
      .optional()
      .isString()
      .withMessage(validationMsg("validation.referralCode_string"))
      .trim(),
    ```
- Schema: `server/prisma/schema.prisma` — `User` model lines 54-56, `Referral` model lines 139-147

## What the handler currently does with the referral code

The handler reads `referralCode` via `matchedData(req)` (no `locations` arg, so it picks up data from body + query + params). Since the validator declares `referralCode` as a `query` param, the mobile client correctly sends it as `?referralCode=...` (see `mobile/src/hooks/useAuth.ts:11-19`).

### Path 1 — re-registering a soft-deleted account (lines 158-227)

```ts
const emailExists = await prisma.user.findUnique({ where: { email } });
if (emailExists) {
  if (emailExists.isDeleted) {
    // ...
    let inviter: User | null = null;
    let alreadyReferred = false;

    if (referralCode) {
      inviter = await prisma.user.findUnique({
        where: { referralCode },
      });
    }
    if (inviter) {
      // before creating referral, make sure this email has never been referred
      const alreadyRef = await prisma.referral.findFirst({
        where: { invitee: { email } },
      });
      alreadyReferred = !!alreadyRef;
    }

    await prisma.user.update({
      where: { id: emailExists.id },
      data: {
        // ... profile fields ...
        // If referred, create Referral record
        ...(inviter &&
          !alreadyReferred && {
          receivedReferral: {
            upsert: {
              create: { inviterId: inviter.id },
              update: { inviterId: inviter.id },
            },
          },
        }),
      },
    });
```

### Path 2 — brand-new user (lines 234-290)

```ts
let inviter: User | null = null;
let alreadyReferred = false;

if (referralCode) {
  inviter = await prisma.user.findUnique({
    where: { referralCode },
  });
}

if (inviter) {
  // before creating referral, make sure this email has never been referred
  const alreadyRef = await prisma.referral.findFirst({
    where: { invitee: { email } },
  });
  alreadyReferred = !!alreadyRef;
}

await prisma.user.create({
  data: {
    // ... profile fields ...
    referralCode: await generateReferralCode(),

    // If referred, create Referral record
    ...(inviter &&
      !alreadyReferred && {
      receivedReferral: {
        create: {
          inviterId: inviter.id,
        },
      },
    }),
  },
});
```

### Behavior summary

1. **Validated?** YES — `auth.request.validator.ts:57-61` validates `referralCode` as an optional trimmed string query param.
2. **Used during `prisma.user.create`?** YES — both the soft-delete re-registration path and the new-user path read the value.
3. **Storage model:** The referral is **NOT** stored as a foreign key on the new user. Instead, a row is inserted into the `Referral` join table with `inviterId = <code owner>.id` and `inviteeId = <new user>.id`. This is done via Prisma's nested `receivedReferral.create` (or `.upsert` for the soft-delete path).
4. **Inviter credit:** The inviter is "credited" implicitly by the existence of the `Referral` row (queryable via `User.sentReferrals`). There is no balance/reward field — credit is purely relational.
5. **Idempotency guard:** Both paths check `prisma.referral.findFirst({ where: { invitee: { email } } })` to prevent double-referral.

## What the schema supports

`server/prisma/schema.prisma`:

```prisma
model User {
  // ... line 54-56 ...
  referralCode          String          @unique
  sentReferrals         Referral[]      @relation("UserInviter")
  receivedReferral      Referral?       @relation("UserInvitee")
  // ...
}

model Referral {
  id        Int      @id @default(autoincrement())
  inviterId Int
  inviteeId Int      @unique
  createdAt DateTime @default(now())

  inviter User @relation("UserInviter", fields: [inviterId], references: [id], onDelete: Cascade)
  invitee User @relation("UserInvitee", fields: [inviteeId], references: [id], onDelete: Cascade)
}
```

### What does NOT exist in the schema

- There is **no** `referredById` column on `User`.
- There is **no** `referredBy` direct relation on `User`.
- A user's inviter is reachable only via `user.receivedReferral.inviter` (one-hop through `Referral`).

## Recommended fix scope

**Code-only — and in fact, no code change is needed at all.** The handler already does the right thing.

The original plan (Task 13 in `2026-05-11-qat-fixes-slice-a.md`) was written under the mistaken assumption that the handler ignored `req.query.referralCode` and that the schema had a `referredById` field. Both assumptions are wrong:

- The handler **does** read `referralCode` (via `matchedData(req)` which includes the query location by default).
- The schema **does not** have `referredById`; the join-table model is in use and is well-formed.

## Recommendation for Task 13 (the TDD test)

The plan's wording — "assert `referredById` is set on register-with-referral" — should be reframed. Two viable options:

### Option A (recommended, no migration): rewrite the assertion

Change the Task 13 test to assert against the existing `Referral` table:

```ts
// After POST /api/v1/auth/register?referralCode=<inviterCode>
const newUser = await prisma.user.findUnique({
  where: { email: payload.email },
  include: { receivedReferral: { include: { inviter: true } } },
});

expect(newUser?.receivedReferral).not.toBeNull();
expect(newUser?.receivedReferral?.inviterId).toBe(inviter.id);
```

This validates the **actually-implemented behavior** and protects it from regression. If the test passes on `main` as-is, Task 13 becomes a pure regression test rather than a fix.

### Option B (NOT recommended, requires migration): add `referredById` to `User`

This would mean:
- Adding `referredById Int?` and `referredBy User? @relation("UserReferredBy", ...)` and the inverse `referredUsers User[] @relation("UserReferredBy")` to `User`.
- Writing a Prisma migration.
- Backfilling the new column from the existing `Referral` table.
- Updating the register handler to also set `referredById` (duplicating data that is already captured by `Referral`).

This duplicates state across two sources of truth and risks them drifting. **Do not do this** unless there is a product-side reason to denormalize (e.g., needing to display "referred by X" on a hot path where the join is too expensive — no such hot path exists in this codebase based on my grep of `referredBy*` and `referral` usage).

## STOP / proceed decision

No migration is required. **No STOP needed.** Task 13 can proceed under Option A above.

## Adjacent observation (not part of A6, but worth noting for the slice owner)

The validator at `auth.request.validator.ts:57` declares `referralCode` as `query()`, but the controller's `matchedData<>(req)` call at `auth.controller.ts:144` does not pin `locations`. Today this works because `express-validator` defaults to all locations. If anyone later adds a same-named `body("referralCode")` validator (e.g. for a different endpoint), or if the controller is hardened to `locations: ["body"]` for consistency with the `login` handler (`auth.controller.ts:35-37`), referrals will silently break. Consider either:

1. Pinning `locations: ["query", "body"]` explicitly in the `register` controller, OR
2. Also accepting `body("referralCode")` in the validator so clients can send it either way.

This is a latent fragility, not a current bug. Out of scope for slice A unless explicitly added.
