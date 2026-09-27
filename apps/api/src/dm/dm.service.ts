import { Injectable, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DmService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateConversation(userId: string, targetUserId: string) {
    const existing = await this.prisma.dmConversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
      },
    });

    if (existing) return this.toConversationResponse(existing, userId);

    const conversation = await this.prisma.dmConversation.create({
      data: {
        participants: {
          createMany: {
            data: [{ userId }, { userId: targetUserId }],
          },
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
      },
    });

    return this.toConversationResponse(conversation, userId);
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.dmConversation.findMany({
      where: { participants: { some: { userId } } },
      include: {
        participants: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    return conversations.map((c) => ({
      id: c.id,
      recipient: c.participants
        .filter((p) => p.userId !== userId)
        .map((p) => p.user)[0] ?? null,
      lastMessage: c.messages[0]
        ? { content: c.messages[0].content, createdAt: c.messages[0].createdAt.toISOString() }
        : null,
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getMessages(conversationId: string, userId: string, cursor?: string) {
    const participant = await this.prisma.dmParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) throw new ForbiddenException("Not a participant");

    const messages = await this.prisma.directMessage.findMany({
      where: { conversationId, deleted: false },
      orderBy: { createdAt: "desc" },
      take: 50,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    return {
      messages: messages.reverse().map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        editedAt: m.editedAt?.toISOString() ?? null,
        createdAt: m.createdAt.toISOString(),
        author: m.author,
      })),
      nextCursor: messages.length === 50 ? messages[0]?.id ?? null : null,
    };
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    const participant = await this.prisma.dmParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) throw new ForbiddenException("Not a participant");

    const message = await this.prisma.directMessage.create({
      data: { conversationId, authorId: userId, content },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await this.prisma.dmConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      editedAt: null,
      createdAt: message.createdAt.toISOString(),
      author: message.author,
    };
  }

  private toConversationResponse(
    conversation: any,
    userId: string,
  ) {
    return {
      id: conversation.id,
      recipient: conversation.participants
        .filter((p: any) => p.userId !== userId)
        .map((p: any) => p.user)[0] ?? null,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }
}
