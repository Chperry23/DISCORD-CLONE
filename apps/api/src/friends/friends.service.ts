import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { FriendshipResponse } from "@discord-clone/shared";

function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<FriendshipResponse[]> {
    const rows = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map((row) => this.toResponse(row, userId));
  }

  async sendRequest(userId: string, targetUserId: string): Promise<FriendshipResponse> {
    if (userId === targetUserId) {
      throw new BadRequestException("Cannot friend yourself");
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw new NotFoundException("User not found");

    const [userAId, userBId] = orderPair(userId, targetUserId);
    const existing = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    if (existing) {
      if (existing.status === "BLOCKED") {
        throw new ForbiddenException("Cannot send request to this user");
      }
      if (existing.status === "ACCEPTED") {
        throw new ConflictException("Already friends");
      }
      if (existing.status === "PENDING") {
        throw new ConflictException("Friend request already pending");
      }
    }

    const created = await this.prisma.friendship.create({
      data: { userAId, userBId, status: "PENDING", requestedById: userId },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return this.toResponse(created, userId);
  }

  async accept(userId: string, friendshipId: string): Promise<FriendshipResponse> {
    const row = await this.getRowOrThrow(friendshipId);
    if (row.status !== "PENDING") {
      throw new BadRequestException("Request is not pending");
    }
    if (row.requestedById === userId) {
      throw new ForbiddenException("Cannot accept your own request");
    }
    if (row.userAId !== userId && row.userBId !== userId) {
      throw new ForbiddenException("Not your friendship");
    }

    const updated = await this.prisma.friendship.update({
      where: { id: friendshipId },
      data: { status: "ACCEPTED" },
      include: {
        userA: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return this.toResponse(updated, userId);
  }

  async remove(userId: string, friendshipId: string): Promise<void> {
    const row = await this.getRowOrThrow(friendshipId);
    if (row.userAId !== userId && row.userBId !== userId) {
      throw new ForbiddenException("Not your friendship");
    }
    await this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  async block(userId: string, targetUserId: string): Promise<void> {
    if (userId === targetUserId) throw new BadRequestException("Invalid target");

    const [userAId, userBId] = orderPair(userId, targetUserId);
    await this.prisma.friendship.upsert({
      where: { userAId_userBId: { userAId, userBId } },
      create: { userAId, userBId, status: "BLOCKED", requestedById: userId },
      update: { status: "BLOCKED", requestedById: userId },
    });
  }

  async unblock(userId: string, targetUserId: string): Promise<void> {
    const [userAId, userBId] = orderPair(userId, targetUserId);
    const row = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (!row || row.status !== "BLOCKED") return;
    if (row.userAId !== userId && row.userBId !== userId) {
      throw new ForbiddenException("Not your block");
    }
    await this.prisma.friendship.delete({ where: { id: row.id } });
  }

  async assertCanDirectMessage(userId: string, targetUserId: string): Promise<void> {
    const [userAId, userBId] = orderPair(userId, targetUserId);
    const row = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (row?.status === "BLOCKED") {
      throw new ForbiddenException("Cannot message this user");
    }
  }

  async areFriends(userId: string, targetUserId: string): Promise<boolean> {
    const [userAId, userBId] = orderPair(userId, targetUserId);
    const row = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    return row?.status === "ACCEPTED";
  }

  private async getRowOrThrow(friendshipId: string) {
    const row = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!row) throw new NotFoundException("Friendship not found");
    return row;
  }

  private toResponse(
    row: {
      id: string;
      status: string;
      createdAt: Date;
      userAId: string;
      userBId: string;
      requestedById: string | null;
      userA: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
      userB: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
    },
    viewerId: string,
  ): FriendshipResponse {
    const other = row.userAId === viewerId ? row.userB : row.userA;
    let direction: FriendshipResponse["direction"] = "none";
    if (row.status === "PENDING" && row.requestedById) {
      direction = row.requestedById === viewerId ? "outgoing" : "incoming";
    }

    return {
      id: row.id,
      status: row.status as FriendshipResponse["status"],
      direction,
      createdAt: row.createdAt.toISOString(),
      user: other,
    };
  }
}
