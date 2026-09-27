import * as crypto from "crypto";

export class StripeSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeSignatureError";
  }
}

/**
 * Verifies a Stripe webhook signature and returns the parsed event payload.
 * @see https://docs.stripe.com/webhooks/signatures
 */
export function verifyStripeWebhookPayload(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  webhookSecret: string,
  toleranceSeconds = 300,
): Record<string, unknown> {
  if (!signatureHeader) {
    throw new StripeSignatureError("Missing stripe-signature header");
  }

  const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const parts = signatureHeader.split(",").map((p) => p.trim());
  let timestamp: number | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t" && value) timestamp = parseInt(value, 10);
    if (key === "v1" && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) {
    throw new StripeSignatureError("Unable to parse stripe-signature header");
  }

  const age = Math.floor(Date.now() / 1000) - timestamp;
  if (age > toleranceSeconds) {
    throw new StripeSignatureError("Timestamp outside tolerance");
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", webhookSecret).update(signedPayload, "utf8").digest("hex");

  const valid = signatures.some((sig) => timingSafeEqualHex(sig, expected));
  if (!valid) {
    throw new StripeSignatureError("No matching signature found");
  }

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    throw new StripeSignatureError("Invalid JSON payload");
  }
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
