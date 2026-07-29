/**
 * Regression test for QAT 2.9 — referral persistence on registration.
 *
 * Verifies that `POST /api/v1/auth/register?referralCode=…` creates a
 * `Referral` row linking the new user (invitee) to the existing user
 * (inviter), per the contract documented in
 * `docs/superpowers/plans/notes/2026-05-11-a6-referral-trace.md` and
 * implemented in `server/src/controllers/auth.controller.ts:134-321`.
 *
 * ---------------------------------------------------------------------------
 * STATUS: BLOCKED — infrastructure missing. This test is written but cannot
 * run in the current repo state. Required follow-up to unblock:
 *
 *   1. Export the Express `app` from a module without top-level side effects.
 *      Today, `server/src/server.ts` calls `prisma.$connect()`,
 *      `server.listen()`, and `initializeCronJobs()` at import time, and
 *      does NOT export `app`. Refactor into e.g. `server/src/app.ts` (pure
 *      app builder + `export const app`) and have `server.ts` import and
 *      bind it to a port. Then change the import below from
 *      `../../server` (placeholder) to `../../app`.
 *
 *   2. Add `supertest` + `@types/supertest` to `server/package.json`
 *      devDependencies. Neither is currently installed.
 *
 *   3. Provide a test Postgres instance and `TEST_DATABASE_URL`, plus a
 *      jest globalSetup that points Prisma at it and runs
 *      `prisma migrate deploy` before tests start. The repo currently
 *      only defines one `DATABASE_URL` (the dev DB on port 5434).
 *
 *   4. Mock or stub `generateAvatar` + `uploadToStorage` (Cloudinary) used
 *      inside `AuthController.register` — they make outbound network
 *      calls and require Cloudinary credentials. Easiest path:
 *      `jest.mock("../../utils/GenerateAvatar")` +
 *      `jest.mock("../../utils/storage")` at the top of this file once
 *      the rest of the infra is in place.
 *
 * Until items 1–4 are in place, this file is intentionally guarded with a
 * `describe.skip` so CI does not fail. Once unblocked, change `.skip` back
 * to `describe(...)` and re-enable the suite.
 * ---------------------------------------------------------------------------
 */

// TODO(infra): import request from "supertest";
// TODO(infra): import { app } from "../../app"; // requires app.ts refactor
import { prisma } from "../../config/database";

describe.skip("POST /auth/register — referral linkage (regression for QAT 2.9)", () => {
  let inviterId: number;
  let inviterReferralCode: string;
  const newbyEmail = "newby-regression@test.local";
  const inviterEmail = "inviter-regression@test.local";

  beforeAll(async () => {
    await prisma.referral.deleteMany({
      where: { invitee: { email: newbyEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [inviterEmail, newbyEmail] } },
    });

    // Plain-text password is fine here — this user only needs to exist as
    // an inviter, we never log in as them. `referralCode` is unique in the
    // schema; we set a deterministic value, but read it back from the
    // returned row in case any extension rewrites it.
    const inviter = await prisma.user.create({
      data: {
        email: inviterEmail,
        password: "Password1",
        firstName: "Inv",
        lastName: "Iter",
        referralCode: "TESTREFREGR",
      },
    });
    inviterId = inviter.id;
    inviterReferralCode = inviter.referralCode!;
  });

  afterAll(async () => {
    await prisma.referral.deleteMany({
      where: { invitee: { email: newbyEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [inviterEmail, newbyEmail] } },
    });
    await prisma.$disconnect();
  });

  it("creates a Referral row when a valid referral code is provided", async () => {
    // TODO(infra): once `app` is importable and supertest is installed,
    // replace the inline assertion below with the real HTTP call:
    //
    //   const res = await request(app)
    //     .post(`/api/v1/auth/register?referralCode=${inviterReferralCode}`)
    //     .send({
    //       firstName: "New",
    //       lastName: "By",
    //       email: newbyEmail,
    //       password: "Password1",
    //       agreeToTerms: true,
    //     });
    //   expect(res.status).toBe(201);
    //
    //   const created = await prisma.user.findUnique({
    //     where: { email: newbyEmail },
    //     include: { receivedReferral: true },
    //   });
    //   expect(created?.receivedReferral?.inviterId).toBe(inviterId);
    expect(inviterId).toBeGreaterThan(0);
    expect(inviterReferralCode).toBeTruthy();
  });

  it("registers without a referral row when the code does not match an existing user", async () => {
    await prisma.referral.deleteMany({
      where: { invitee: { email: newbyEmail } },
    });
    await prisma.user.deleteMany({ where: { email: newbyEmail } });

    // TODO(infra): once `app` is importable and supertest is installed,
    // replace the inline assertion below with the real HTTP call:
    //
    //   const res = await request(app)
    //     .post(`/api/v1/auth/register?referralCode=DOES_NOT_EXIST`)
    //     .send({
    //       firstName: "New",
    //       lastName: "By",
    //       email: newbyEmail,
    //       password: "Password1",
    //       agreeToTerms: true,
    //     });
    //   expect(res.status).toBe(201);
    //
    //   const created = await prisma.user.findUnique({
    //     where: { email: newbyEmail },
    //     include: { receivedReferral: true },
    //   });
    //   expect(created?.receivedReferral).toBeNull();
    expect(true).toBe(true);
  });
});
