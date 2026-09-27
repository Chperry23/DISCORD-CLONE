import { verifyStripeWebhookPayload, StripeSignatureError } from "./stripe-signature.util";
import * as crypto from "crypto";

describe("verifyStripeWebhookPayload", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });

  function sign(body: string, timestamp: number): string {
    const signed = `${timestamp}.${body}`;
    const v1 = crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    return `t=${timestamp},v1=${v1}`;
  }

  it("accepts a valid signature", () => {
    const ts = Math.floor(Date.now() / 1000);
    const event = verifyStripeWebhookPayload(payload, sign(payload, ts), secret);
    expect(event["type"]).toBe("checkout.session.completed");
  });

  it("rejects missing header", () => {
    expect(() => verifyStripeWebhookPayload(payload, undefined, secret)).toThrow(
      StripeSignatureError,
    );
  });

  it("rejects tampered payload", () => {
    const ts = Math.floor(Date.now() / 1000);
    expect(() =>
      verifyStripeWebhookPayload(`${payload}x`, sign(payload, ts), secret),
    ).toThrow(StripeSignatureError);
  });

  it("rejects stale timestamps", () => {
    const ts = Math.floor(Date.now() / 1000) - 600;
    expect(() => verifyStripeWebhookPayload(payload, sign(payload, ts), secret, 300)).toThrow(
      StripeSignatureError,
    );
  });
});
