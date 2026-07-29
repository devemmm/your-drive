import crypto from "crypto";

function resolveSecret(): string {
  const secret =
    process.env.DRIVER_PRESENCE_TOKEN_SECRET ?? process.env.SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Driver presence token secret missing: set DRIVER_PRESENCE_TOKEN_SECRET or SECRET_KEY"
    );
  }
  return secret;
}

export function currentRotationKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function hashDriverToken(
  userId: number,
  rotationKey: string = currentRotationKey(),
  secret: string = resolveSecret()
): string {
  return crypto
    .createHmac("sha256", `${secret}:${rotationKey}`)
    .update(String(userId))
    .digest("base64url");
}
