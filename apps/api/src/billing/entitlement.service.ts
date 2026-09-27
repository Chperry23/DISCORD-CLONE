import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { EntitlementKind, EntitlementResponse, EntitlementStatus } from "@discord-clone/shared";

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async hasActiveProfileBadge(userId: string): Promise<boolean> {
    const count = await this.prisma.entitlement.count({
      where: { userId, kind: "PROFILE_BADGE", status: "ACTIVE" },
    });
    return count > 0;
  }

  async hasActiveServerBoost(serverId: string): Promise<boolean> {
    const count = await this.prisma.entitlement.count({
      where: { serverId, kind: "SERVER_BOOST", status: "ACTIVE" },
    });
    return count > 0;
  }

  async profileBadgeUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();
    const rows = await this.prisma.entitlement.findMany({
      where: { userId: { in: userIds }, kind: "PROFILE_BADGE", status: "ACTIVE" },
      select: { userId: true },
      distinct: ["userId"],
    });
    return new Set(rows.map((r) => r.userId));
  }

  async boostedServerIds(serverIds: string[]): Promise<Set<string>> {
    if (serverIds.length === 0) return new Set();
    const rows = await this.prisma.entitlement.findMany({
      where: { serverId: { in: serverIds }, kind: "SERVER_BOOST", status: "ACTIVE" },
      select: { serverId: true },
      distinct: ["serverId"],
    });
    return new Set(rows.map((r) => r.serverId!).filter(Boolean));
  }

  async listForUser(userId: string): Promise<EntitlementResponse[]> {
    const rows = await this.prisma.entitlement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => this.toResponse(r));
  }

  async upsertFromCheckoutSession(input: {
    userId: string;
    kind: EntitlementKind;
    serverId: string | null;
    sessionId: string;
    subscriptionId: string | null;
    validUntil: Date | null;
    stripeEventId: string;
  }) {
    const existing = await this.prisma.entitlement.findUnique({
      where: { stripeCheckoutSessionId: input.sessionId },
    });
    if (existing?.lastStripeEventId === input.stripeEventId) {
      return existing;
    }

    if (existing) {
      return this.prisma.entitlement.update({
        where: { id: existing.id },
        data: {
          status: "ACTIVE",
          stripeSubscriptionId: input.subscriptionId ?? existing.stripeSubscriptionId,
          validUntil: input.validUntil,
          lastStripeEventId: input.stripeEventId,
        },
      });
    }

    return this.prisma.entitlement.create({
      data: {
        userId: input.userId,
        kind: input.kind,
        status: "ACTIVE",
        serverId: input.serverId,
        stripeCheckoutSessionId: input.sessionId,
        stripeSubscriptionId: input.subscriptionId,
        validUntil: input.validUntil,
        lastStripeEventId: input.stripeEventId,
      },
    });
  }

  async syncSubscription(input: {
    subscriptionId: string;
    status: EntitlementStatus;
    validUntil: Date | null;
    stripeEventId: string;
  }) {
    const row = await this.prisma.entitlement.findUnique({
      where: { stripeSubscriptionId: input.subscriptionId },
    });
    if (!row) return null;
    if (row.lastStripeEventId === input.stripeEventId) return row;

    return this.prisma.entitlement.update({
      where: { id: row.id },
      data: {
        status: input.status,
        validUntil: input.validUntil,
        lastStripeEventId: input.stripeEventId,
      },
    });
  }

  private toResponse(row: {
    id: string;
    kind: string;
    status: string;
    serverId: string | null;
    validUntil: Date | null;
    createdAt: Date;
  }): EntitlementResponse {
    return {
      id: row.id,
      kind: row.kind as EntitlementKind,
      status: row.status as EntitlementStatus,
      serverId: row.serverId,
      validUntil: row.validUntil?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
