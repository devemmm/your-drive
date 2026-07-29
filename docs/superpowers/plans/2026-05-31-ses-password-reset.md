# SES Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the no-op email shim with a thin AWS SES adapter scoped to `sendPasswordResetEmail`, wire the call into the existing forgot-password email path, and ship a server that boots fine without credentials so QA continues to read reset OTPs from the DB.

**Architecture:** Server-only change. `server/src/config/email.ts` becomes an SES adapter that constructs a `SESv2Client` at module load when env vars are present, exposes `sendPasswordResetEmail()` that calls SES inside a try/catch, and keeps every other previously-exported helper as a no-op shim. `auth.controller.ts` `forgotPassword` gains a single `await sendPasswordResetEmail(...)` call after `prisma.user.update({ resetToken, ... })` on the email branch; the boolean return is intentionally ignored so the controller still returns its generic success message.

**Tech Stack:** TypeScript, Node, Express, AWS SDK v3 (`@aws-sdk/client-sesv2`), Jest, Prisma.

**Spec:** `docs/superpowers/specs/2026-05-31-ses-password-reset-design.md`

---

### Task 1: Add the SES SDK dependency

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install the SES v2 client**

Run from repo root:

```bash
cd server && npm install @aws-sdk/client-sesv2
```

Expected: `package.json` gains `"@aws-sdk/client-sesv2": "^3.x.x"` under `dependencies`, and `package-lock.json` updates.

- [ ] **Step 2: Verify it resolves**

Run:

```bash
cd server && node -e "console.log(require('@aws-sdk/client-sesv2').SESv2Client.name)"
```

Expected output: `SESv2Client`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "deps(server): add @aws-sdk/client-sesv2 for SES password reset"
```

---

### Task 2: Rewrite `email.ts` as an SES adapter with retained no-op stubs

**Files:**
- Modify (full rewrite): `server/src/config/email.ts`

- [ ] **Step 1: Replace the file with the SES adapter**

Write the entire file as follows. The exported function set must match the previous shim's exports exactly so no caller breaks.

```ts
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "../utils/logger";

const REGION = process.env.AWS_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const FROM = process.env.SES_FROM_ADDRESS;

const isConfigured = Boolean(REGION && ACCESS_KEY && SECRET_KEY && FROM);

if (!isConfigured) {
  logger.warn(
    "[email] SES not configured (missing AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_ADDRESS) — email sending will be silently skipped."
  );
}

const sesClient = isConfigured
  ? new SESv2Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY as string,
        secretAccessKey: SECRET_KEY as string,
      },
    })
  : null;

async function sendViaSES(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<boolean> {
  if (!sesClient) return false;
  try {
    await sesClient.send(
      new SendEmailCommand({
        FromEmailAddress: FROM as string,
        Destination: { ToAddresses: [args.to] },
        Content: {
          Simple: {
            Subject: { Data: args.subject, Charset: "UTF-8" },
            Body: {
              Text: { Data: args.text, Charset: "UTF-8" },
              Html: { Data: args.html, Charset: "UTF-8" },
            },
          },
        },
      })
    );
    return true;
  } catch (err) {
    logger.warn("[email] SES send failed", {
      err: err instanceof Error ? err.message : String(err),
      to: args.to,
    });
    return false;
  }
}

export const sendPasswordResetEmail = async (
  email: string,
  resetCode: string
): Promise<boolean> => {
  return sendViaSES({
    to: email,
    subject: "Your YourDrive password reset code",
    text: `Your password reset code is ${resetCode}. It expires in 60 minutes. If you didn't request this, ignore this email.`,
    html:
      `<p>Your password reset code is <strong>${resetCode}</strong>.</p>` +
      `<p>It expires in 60 minutes. If you didn't request this, ignore this email.</p>`,
  });
};

const logDisabled = (fn: string) =>
  logger.warn(`[email-disabled] ${fn} called; ignoring.`);

export const sendEmail = async (): Promise<boolean> => {
  logDisabled("sendEmail");
  return false;
};
export const sendVerificationEmail = async (): Promise<boolean> => {
  logDisabled("sendVerificationEmail");
  return false;
};
export const sendWelcomeEmail = async (): Promise<boolean> => {
  logDisabled("sendWelcomeEmail");
  return false;
};
export const sendNotificationEmail = async (): Promise<boolean> => {
  logDisabled("sendNotificationEmail");
  return false;
};
export const sendWebPasswordResetEmail = async (): Promise<boolean> => {
  logDisabled("sendWebPasswordResetEmail");
  return false;
};
export const sendPasswordResetConfirmationEmail = async (): Promise<boolean> => {
  logDisabled("sendPasswordResetConfirmationEmail");
  return false;
};
export const sendInviteEmail = async (): Promise<boolean> => {
  logDisabled("sendInviteEmail");
  return false;
};
export const sendBookingConfirmationEmail = async (): Promise<boolean> => {
  logDisabled("sendBookingConfirmationEmail");
  return false;
};
export const sendPaymentReceiptEmail = async (): Promise<boolean> => {
  logDisabled("sendPaymentReceiptEmail");
  return false;
};
export const sendSuspensionEmail = async (): Promise<boolean> => {
  logDisabled("sendSuspensionEmail");
  return false;
};
export const sendAccountRecoveryEmail = async (): Promise<boolean> => {
  logDisabled("sendAccountRecoveryEmail");
  return false;
};
export const sendD2DRequestEmail = async (): Promise<boolean> => {
  logDisabled("sendD2DRequestEmail");
  return false;
};
export const sendD2DRideStartedEmail = async (): Promise<boolean> => {
  logDisabled("sendD2DRideStartedEmail");
  return false;
};
export const sendD2DCompletionEmailPassenger = async (): Promise<boolean> => {
  logDisabled("sendD2DCompletionEmailPassenger");
  return false;
};
export const sendD2DCompletionEmailDriver = async (): Promise<boolean> => {
  logDisabled("sendD2DCompletionEmailDriver");
  return false;
};
```

- [ ] **Step 2: Type-check the server**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean. If a previously-exported helper was removed by this rewrite, callers will fail to compile — re-add the missing helper as a `logDisabled` no-op above.

- [ ] **Step 3: Verify the server boots without env vars**

Run:

```bash
cd server && AWS_REGION= AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= SES_FROM_ADDRESS= node -e "require('./dist/src/config/email.js')" 2>&1 | head -5
```

If `dist/` does not exist yet, build first with `npx tsc -p .`, then re-run. Expected: a single line containing `SES not configured (missing` and no thrown error.

- [ ] **Step 4: Commit**

```bash
git add server/src/config/email.ts
git commit -m "feat(email): SES adapter for sendPasswordResetEmail; other helpers stay no-op"
```

---

### Task 3: Wire `sendPasswordResetEmail` into the email branch of `forgotPassword`

**Files:**
- Modify: `server/src/controllers/auth.controller.ts` (around line 761, immediately after `await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });` on the email branch — search for that exact `prisma.user.update` call within `static forgotPassword =`)

- [ ] **Step 1: Insert the email send call**

After the `await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpiry } });` line on the email branch (the second occurrence in `forgotPassword`; the first is on the phone branch and stays untouched), add:

```ts
// Fire-and-forget: SES adapter swallows errors and returns false when
// unconfigured or when the send fails. We intentionally do not surface
// the result — the generic success message above already disguises
// whether the email was registered. QA reads resetToken from the DB
// until SES credentials are provisioned. See:
// docs/superpowers/specs/2026-05-31-ses-password-reset-design.md
await sendPasswordResetEmail(user.email!, resetToken);
```

The `sendPasswordResetEmail` import already exists at `auth.controller.ts:7`; no import change needed.

- [ ] **Step 2: Type-check**

Run:

```bash
cd server && npx tsc --noEmit
```

Expected: clean. If `user.email` is typed `string | null`, the `!` non-null assertion is fine here because the email branch only runs when `email` was provided in the request body and the user was located by that email (so `user.email === email`).

- [ ] **Step 3: Commit**

```bash
git add server/src/controllers/auth.controller.ts
git commit -m "feat(auth): call sendPasswordResetEmail on forgot-password email branch"
```

---

### Task 4: Unit tests for the SES adapter

**Files:**
- Create: `server/src/config/__tests__/email.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { jest } from "@jest/globals";

const sendMock = jest.fn();

jest.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const warnMock = jest.fn();
jest.mock("../../utils/logger", () => ({
  logger: { warn: warnMock, info: jest.fn(), error: jest.fn() },
}));

describe("email config — SES adapter", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    sendMock.mockReset();
    warnMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("logs a warning at load time when env vars are missing", async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.SES_FROM_ADDRESS;

    await import("../email");

    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("SES not configured")
    );
  });

  test("sendPasswordResetEmail returns false when not configured", async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.SES_FROM_ADDRESS;

    const { sendPasswordResetEmail } = await import("../email");
    const result = await sendPasswordResetEmail("a@b.com", "123456");

    expect(result).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("sendPasswordResetEmail returns true on successful SES send", async () => {
    process.env.AWS_REGION = "eu-west-1";
    process.env.AWS_ACCESS_KEY_ID = "k";
    process.env.AWS_SECRET_ACCESS_KEY = "s";
    process.env.SES_FROM_ADDRESS = "no-reply@yourdrive.rw";
    sendMock.mockResolvedValueOnce({} as never);

    const { sendPasswordResetEmail } = await import("../email");
    const result = await sendPasswordResetEmail("a@b.com", "654321");

    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = (sendMock.mock.calls[0] as unknown[])[0] as {
      input: { Destination: { ToAddresses: string[] } };
    };
    expect(cmd.input.Destination.ToAddresses).toEqual(["a@b.com"]);
  });

  test("sendPasswordResetEmail returns false and logs warning on SES error", async () => {
    process.env.AWS_REGION = "eu-west-1";
    process.env.AWS_ACCESS_KEY_ID = "k";
    process.env.AWS_SECRET_ACCESS_KEY = "s";
    process.env.SES_FROM_ADDRESS = "no-reply@yourdrive.rw";
    sendMock.mockRejectedValueOnce(new Error("Throttling"));

    const { sendPasswordResetEmail } = await import("../email");
    const result = await sendPasswordResetEmail("a@b.com", "111111");

    expect(result).toBe(false);
    expect(warnMock).toHaveBeenCalledWith(
      "[email] SES send failed",
      expect.objectContaining({ err: "Throttling", to: "a@b.com" })
    );
  });

  test("other helpers remain no-ops", async () => {
    delete process.env.AWS_REGION;

    const mod = await import("../email");
    expect(await mod.sendWelcomeEmail()).toBe(false);
    expect(await mod.sendBookingConfirmationEmail()).toBe(false);
    expect(await mod.sendPaymentReceiptEmail()).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests**

Run:

```bash
cd server && npx jest src/config/__tests__/email.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add server/src/config/__tests__/email.test.ts
git commit -m "test(email): SES adapter unit tests (unconfigured / success / error / no-op)"
```

---

### Task 5: Smoke test the full forgot-password email flow against a dev DB

**Files:** none modified — verification only.

- [ ] **Step 1: Boot the server with empty SES env vars**

Run from a terminal:

```bash
cd server && AWS_REGION= AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= SES_FROM_ADDRESS= npm run dev
```

Expected: server starts; logs show `[email] SES not configured` once.

- [ ] **Step 2: Trigger a forgot-password by email**

In a second terminal:

```bash
curl -i -X POST http://localhost:3000/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"<a real seeded user email>"}'
```

Expected response: HTTP 200 with a generic success message in the body.

Expected server logs: an INFO line "Password reset instructions sent successfully" plus a WARN line "[email-disabled] sendPasswordResetEmail called; ignoring." is **not** expected — instead you should see no SES-related WARN if you read the path correctly. (If you see `[email-disabled]`, the wiring in Task 3 is wrong — the controller is still calling a stub.)

- [ ] **Step 3: Confirm the OTP landed in the DB**

```bash
psql "$DATABASE_URL" -c "SELECT id, email, \"resetToken\", \"resetTokenExpiry\" FROM \"User\" WHERE email = '<that email>';"
```

Expected: a 6-digit `resetToken` and a `resetTokenExpiry` ~60 minutes in the future.

- [ ] **Step 4: Use the OTP via reset-password**

```bash
curl -i -X POST http://localhost:3000/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"<that email>","token":"<the OTP from step 3>","newPassword":"NewPass123"}'
```

Expected: HTTP 200 with success message.

- [ ] **Step 5: No commit — manual verification only**

If any step failed, fix the cause in Task 2 or Task 3 and re-run from Step 1.

---

## Self-Review Checklist

**Spec coverage:**
- §Goals 1 — Task 2 (SES adapter)
- §Goals 2 — Task 3 (wire call)
- §Goals 3 — Task 2 (unconfigured returns false, no throw) + Task 4 (tests)
- §Goals 4 — Task 2 (env-driven module initialisation, no redeploy)
- §Approach — Tasks 2 + 3
- §Module structure — Task 2
- §Caller wiring — Task 3
- §Dependency — Task 1
- §Mobile (no changes) — N/A
- §Tests — Task 4 + Task 5

**Placeholder scan:** none — all code is complete, all commands are exact, all expected outputs are stated.

**Type consistency:** `sendPasswordResetEmail(email: string, resetCode: string)` matches the import-site call signature.
