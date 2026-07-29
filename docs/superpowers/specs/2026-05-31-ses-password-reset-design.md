# SES Password Reset — Design

**Status:** Draft for review
**Date:** 2026-05-31
**Branch:** TBD on plan
**Source:** Gap-analysis residual — `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md` §6 entry #25 ("Email notifications — disabled, no-op shim"); test-script §3.5/3.6/3.7 ("Revisit — requires email sending to be configured").

## Background

Password reset is half-built. `server/src/controllers/auth.controller.ts:646-746` (`forgotPassword`) accepts either `email` or `phone`:
- The phone path generates a code, persists it to `User.resetToken` + `User.resetTokenExpiry`, and sends via Twilio's `SmsService.sendSMS`. End-to-end functional today.
- The email path generates and persists the token identically — but the actual `sendPasswordResetEmail()` call goes through `server/src/config/email.ts`, which is a no-op shim that logs a warning and returns false. The user never receives the email.

`mobile/src/app/(auth)/forgot-password.tsx` exposes only the email path (`schema = z.object({ email: z.string().email() })`).

The client has chosen **AWS SES** as the email provider but has not yet supplied credentials. We need email-based reset working code-side so the moment credentials are added to Expo / EAS env, sends start working with no redeploy.

## Goals

1. Replace `server/src/config/email.ts` no-op shim with a thin AWS SES adapter.
2. `sendPasswordResetEmail()` actually sends when SES credentials are present.
3. When credentials are missing or SES rejects the send, log a warning and return `false`. Never throw. Never block the reset flow — the OTP is already persisted to `User.resetToken` and QA can pull it from the DB.
4. Once credentials are added in Expo / EAS, sends start working without a code redeploy.

## Non-goals

- Restoring the other `send*` helpers (booking confirmation, payment receipt, suspension, D2D event emails, welcome, verification). They remain no-op shims with the warn log. If the client wants any of them re-enabled, it's a separate slice.
- Mobile UI changes. The `forgot-password.tsx` screen stays email-only.
- Email template polish beyond a clean reset-code message.
- A "resend code" cooldown UI on mobile.
- HTML email design / branding beyond a plain functional template.
- Switching the phone path away from Twilio.
- A new admin "email log" tab.

## Approach

**Server-side only.** Replace the shim with an SES adapter scoped to `sendPasswordResetEmail`. Leave the other helpers as warn-and-return-false stubs.

### Configuration

Four new env vars (consumed at server startup):
- `AWS_REGION` — e.g. `eu-west-1`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `SES_FROM_ADDRESS` — e.g. `no-reply@yourdrive.rw` (must be a verified SES identity)

Loaded via the existing config layer (`server/src/config/env.ts` if present, otherwise direct `process.env` reads — match repo convention at implementation time).

**Startup behavior:** at module load, check the four env vars. If any are missing, log one `warn` line:
```
[email] SES not configured (missing AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / SES_FROM_ADDRESS) — email sending will be silently skipped.
```
Server continues to boot. The same try/catch path at send time also returns false if the SES client wasn't constructed.

### Module structure

`server/src/config/email.ts`:

```ts
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { logger } from "../utils/logger";

const REGION = process.env.AWS_REGION;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const FROM = process.env.SES_FROM_ADDRESS;

const isConfigured = Boolean(REGION && ACCESS_KEY && SECRET_KEY && FROM);

if (!isConfigured) {
  logger.warn("[email] SES not configured — email sending will be silently skipped.");
}

const sesClient = isConfigured
  ? new SESv2Client({
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY!, secretAccessKey: SECRET_KEY! },
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
        FromEmailAddress: FROM!,
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
    logger.warn("[email] SES send failed", { err: String(err), to: args.to });
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
    text: `Your password reset code is ${resetCode}. It expires in 60 minutes.`,
    html: `<p>Your password reset code is <strong>${resetCode}</strong>.</p>
           <p>It expires in 60 minutes. If you didn't request this, ignore this email.</p>`,
  });
};

// All other helpers remain no-ops.
const logDisabled = (fn: string) => logger.warn(`[email-disabled] ${fn} called; ignoring.`);
export const sendEmail = async (): Promise<boolean> => { logDisabled("sendEmail"); return false; };
export const sendVerificationEmail = async (): Promise<boolean> => { logDisabled("sendVerificationEmail"); return false; };
// ... (every other existing export stays as a no-op shim with logDisabled)
```

### Caller wiring

`auth.controller.ts:766` currently does not call `sendPasswordResetEmail` — when the existing email-path code generates the token and stores it, the email send was removed during the shim era. We restore the call:

```ts
// after prisma.user.update({ ... resetToken, resetTokenExpiry })
await sendPasswordResetEmail(user.email, resetToken);
```

The boolean return is intentionally ignored. The endpoint already returns a generic success message regardless ("Password reset instructions sent to email …") to avoid leaking which emails are registered. If SES fails or is unconfigured, the user sees the same success message; the token still works; QA copies it from the DB.

### Dependency

Add `@aws-sdk/client-sesv2` to `server/package.json`. Choose `v2` (newer, lighter, and current AWS recommendation) over the legacy `v1` SES client.

## Mobile

No changes. `forgot-password.tsx` stays as-is.

## OTP availability for QA before credentials land

Already works today and continues to work:
- `forgotPassword` controller writes `resetToken` + `resetTokenExpiry` on the `User` row regardless of email-send outcome.
- QA reads the token directly:
  ```sql
  SELECT id, email, resetToken, resetTokenExpiry FROM "User" WHERE email = '<test@…>';
  ```
- `resetPassword` endpoint validates the token as today.

We add **no** developer-mode endpoint to expose the token via the API. The DB lookup is intentional friction so it never lands as a usable production backdoor.

## Day-1 go-live

Client adds the four env vars in Expo / EAS env (same mechanism they've used for other secrets). Restart the server. Next forgot-password call sends a real email. Zero code redeploy.

A verified SES sender identity (the `SES_FROM_ADDRESS` domain or address) must exist in the client's AWS account before sends will succeed. Out of our scope — flag in the go-live runbook.

## Tests

**Server (Jest):**
- `email.config.test.ts`:
  - With all four env vars missing → `sendPasswordResetEmail()` returns `false` and logs the disabled warning. No SES client constructed.
  - With env vars present but a stubbed `SESv2Client.send` that throws → returns `false` and logs the SES error warning. Does not throw.
  - With env vars present and `send` resolving → returns `true`.
- Integration test on `POST /auth/forgot-password` with `{ email }`:
  - Existing user → 200, generic success message, `resetToken` persisted on the User row. (Already covered if the existing test exists; otherwise add.)
  - Unknown email → 200, generic success message, no row mutated.

No mobile tests — no mobile changes.

## Open questions

None.

## Future scope (not in this slice)

- Re-enable other `send*` helpers (welcome, verification, booking confirmation, payment receipt, suspension, D2D events) — one slice per cluster.
- A "resend code" cooldown on the mobile forgot-password screen.
- HTML email branding / template system.
- Switch SMS provider from Twilio to a Rwanda-native gateway.

## Cross-references

- `docs/superpowers/specs/2026-04-16-feature-gap-analysis.md` §6 entry #25
- `server/src/controllers/auth.controller.ts:646-797` (forgot/reset password flow — unchanged contract)
- `server/src/config/email.ts` (the file being replaced)
