import { StripeWebhookService } from "./stripe-webhook.service";
import { EntitlementService } from "./entitlement.service";
import { BillingService } from "./billing.service";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

const mockEntitlements = {
  upsertFromCheckoutSession: jest.fn(),
  syncSubscription: jest.fn(),
};

const mockBilling = {
  assertCosmeticOnly: jest.fn(),
};

describe("StripeWebhookService", () => {
  let service: StripeWebhookService;
  const secret = "whsec_webhook_test";

  beforeEach(() => {
    service = new StripeWebhookService(
      { get: (key: string) => (key === "STRIPE_WEBHOOK_SECRET" ? secret : undefined) } as ConfigService,
      mockEntitlements as unknown as EntitlementService,
      mockBilling as unknown as BillingService,
    );
    jest.clearAllMocks();
  });

  async function dispatchEvent(body: object): Promise<void> {
    const payload = JSON.stringify(body);
    const ts = Math.floor(Date.now() / 1000);
    const signed = `${ts}.${payload}`;
    const v1 = crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");
    const signature = `t=${ts},v1=${v1}`;
    const result = await service.handleRawWebhook(Buffer.from(payload), signature);
    expect(result.received).toBe(true);
  }

  it("grants profile badge on checkout.session.completed", async () => {
    await dispatchEvent({
      id: "evt_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          client_reference_id: "user-1",
          subscription: null,
          metadata: { entitlementKind: "PROFILE_BADGE", userId: "user-1" },
        },
      },
    });

    expect(mockBilling.assertCosmeticOnly).toHaveBeenCalledWith("PROFILE_BADGE");
    expect(mockEntitlements.upsertFromCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        kind: "PROFILE_BADGE",
        sessionId: "cs_test",
        stripeEventId: "evt_checkout_1",
      }),
    );
  });

  it("rejects invalid signatures", async () => {
    await expect(service.handleRawWebhook(Buffer.from("{}"), "t=1,v1=bad")).rejects.toThrow();
  });
});
