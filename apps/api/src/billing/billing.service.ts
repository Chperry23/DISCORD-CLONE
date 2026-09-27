import {
  Injectable,
  ServiceUnavailableException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { EntitlementService } from "./entitlement.service";
import type {
  CheckoutSessionResponse,
  MyEntitlementsResponse,
  ServerBoostCheckoutDto,
} from "@discord-clone/shared";

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly entitlements: EntitlementService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>("STRIPE_SECRET_KEY"));
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      const key = this.config.get<string>("STRIPE_SECRET_KEY");
      if (!key) {
        throw new ServiceUnavailableException("Stripe billing is not configured");
      }
      this.stripe = new Stripe(key);
    }
    return this.stripe;
  }

  async getMyEntitlements(userId: string): Promise<MyEntitlementsResponse> {
    const entitlements = await this.entitlements.listForUser(userId);
    const profileBadge = entitlements.some(
      (e) => e.kind === "PROFILE_BADGE" && e.status === "ACTIVE",
    );
    return { profileBadge, entitlements };
  }

  async createServerBoostCheckout(
    userId: string,
    dto: ServerBoostCheckoutDto,
  ): Promise<CheckoutSessionResponse> {
    await this.authz.assertMemberRole(dto.serverId, userId, ["OWNER", "ADMIN"]);

    const priceId = this.config.get<string>("STRIPE_PRICE_SERVER_BOOST");
    if (!this.isConfigured() || !priceId) {
      return { url: null, sessionId: "", configured: false };
    }

    const customerId = await this.ensureStripeCustomer(userId);
    const frontend = this.config.get<string>("FRONTEND_URL", "http://localhost:3000");

    const session = await this.getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontend}/channels/${dto.serverId}?boost=success`,
      cancel_url: `${frontend}/channels/${dto.serverId}?boost=canceled`,
      client_reference_id: userId,
      metadata: {
        entitlementKind: "SERVER_BOOST",
        userId,
        serverId: dto.serverId,
      },
      subscription_data: {
        metadata: {
          entitlementKind: "SERVER_BOOST",
          userId,
          serverId: dto.serverId,
        },
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
      configured: true,
    };
  }

  async createProfileBadgeCheckout(userId: string): Promise<CheckoutSessionResponse> {
    const priceId = this.config.get<string>("STRIPE_PRICE_PROFILE_BADGE");
    if (!this.isConfigured() || !priceId) {
      return { url: null, sessionId: "", configured: false };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const customerId = await this.ensureStripeCustomer(userId);
    const frontend = this.config.get<string>("FRONTEND_URL", "http://localhost:3000");

    const session = await this.getStripe().checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontend}/channels?badge=success`,
      cancel_url: `${frontend}/channels?badge=canceled`,
      client_reference_id: userId,
      metadata: {
        entitlementKind: "PROFILE_BADGE",
        userId,
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
      configured: true,
    };
  }

  private async ensureStripeCustomer(userId: string): Promise<string> {
    const existing = await this.prisma.billingCustomer.findUnique({ where: { userId } });
    if (existing) return existing.stripeCustomerId;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const customer = await this.getStripe().customers.create({
      email: user.email,
      metadata: { userId },
    });

    await this.prisma.billingCustomer.create({
      data: { userId, stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async assertCosmeticOnly(kind: string): Promise<void> {
    if (kind !== "SERVER_BOOST" && kind !== "PROFILE_BADGE") {
      throw new ForbiddenException("Only cosmetic entitlements are sold on this platform");
    }
  }
}
