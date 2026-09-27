import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntitlementService } from "./entitlement.service";
import { BillingService } from "./billing.service";
import { verifyStripeWebhookPayload, StripeSignatureError } from "./stripe-signature.util";
import type { EntitlementKind, EntitlementStatus } from "@discord-clone/shared";

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly entitlements: EntitlementService,
    private readonly billing: BillingService,
  ) {}

  async handleRawWebhook(
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<{ received: boolean }> {
    const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.warn("STRIPE_WEBHOOK_SECRET not set; ignoring webhook");
      return { received: false };
    }

    let event: Record<string, unknown>;
    try {
      event = verifyStripeWebhookPayload(rawBody, signatureHeader, secret);
    } catch (err) {
      if (err instanceof StripeSignatureError) {
        this.logger.warn(`Webhook signature failed: ${err.message}`);
        throw err;
      }
      throw err;
    }

    await this.processEvent(event);
    return { received: true };
  }

  private async processEvent(event: Record<string, unknown>): Promise<void> {
    const type = event["type"] as string | undefined;
    const eventId = event["id"] as string | undefined;
    const data = event["data"] as { object?: Record<string, unknown> } | undefined;
    const object = data?.object;
    if (!type || !eventId || !object) return;

    try {
      switch (type) {
        case "checkout.session.completed":
          await this.onCheckoutCompleted(object, eventId);
          break;
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          await this.onSubscriptionChange(object, eventId, type);
          break;
        case "invoice.paid":
          await this.onInvoicePaid(object, eventId);
          break;
        default:
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to process Stripe event ${eventId}`, error as Error);
    }
  }

  private async onCheckoutCompleted(session: Record<string, unknown>, eventId: string) {
    const metadata = (session["metadata"] ?? {}) as Record<string, string>;
    const kind = metadata["entitlementKind"] as EntitlementKind | undefined;
    if (!kind) return;

    await this.billing.assertCosmeticOnly(kind);

    const userId = metadata["userId"] ?? (session["client_reference_id"] as string | undefined);
    if (!userId) return;

    const sessionId = session["id"] as string;
    const subscriptionId = (session["subscription"] as string | null) ?? null;
    const serverId = metadata["serverId"] ?? null;

    let validUntil: Date | null = null;
    if (kind === "PROFILE_BADGE") {
      validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    await this.entitlements.upsertFromCheckoutSession({
      userId,
      kind,
      serverId,
      sessionId,
      subscriptionId,
      validUntil,
      stripeEventId: eventId,
    });
  }

  private async onSubscriptionChange(
    subscription: Record<string, unknown>,
    eventId: string,
    type: string,
  ) {
    const subscriptionId = subscription["id"] as string;
    const statusRaw = subscription["status"] as string;
    const periodEnd = subscription["current_period_end"] as number | undefined;

    let status: EntitlementStatus = "ACTIVE";
    if (type === "customer.subscription.deleted" || statusRaw === "canceled") {
      status = "CANCELED";
    } else if (statusRaw === "unpaid" || statusRaw === "incomplete_expired") {
      status = "EXPIRED";
    }

    const validUntil =
      periodEnd != null ? new Date(periodEnd * 1000) : null;

    await this.entitlements.syncSubscription({
      subscriptionId,
      status,
      validUntil,
      stripeEventId: eventId,
    });
  }

  private async onInvoicePaid(invoice: Record<string, unknown>, eventId: string) {
    const subscriptionId = invoice["subscription"] as string | null;
    if (!subscriptionId) return;

    const periodEnd = invoice["lines"] as
      | { data?: Array<{ period?: { end?: number } }> }
      | undefined;
    const end = periodEnd?.data?.[0]?.period?.end;
    const validUntil = end != null ? new Date(end * 1000) : null;

    await this.entitlements.syncSubscription({
      subscriptionId,
      status: "ACTIVE",
      validUntil,
      stripeEventId: eventId,
    });
  }
}
