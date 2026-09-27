import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { RealtimeService } from "../realtime/realtime.service";
import type { CreateThreadDto, ThreadInfoResponse, ChannelResponse } from "@discord-clone/shared";

@Injectable()
export class ThreadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly realtime: RealtimeService,
  ) {}

  async getThreadForMessage(
    channelId: string,
    messageId: string,
    userId: string,
  ): Promise<ThreadInfoResponse | null> {
    await this.authz.assertChannelReadable(channelId, userId);

    const thread = await this.prisma.channel.findFirst({
      where: { parentMessageId: messageId, parentChannelId: channelId, type: "THREAD" },
    });
    if (!thread) return null;

    return {
      threadChannelId: thread.id,
      parentMessageId: messageId,
      parentChannelId: channelId,
      name: thread.name,
    };
  }

  async createThread(
    channelId: string,
    messageId: string,
    userId: string,
    dto: CreateThreadDto,
  ): Promise<ThreadInfoResponse> {
    const parentChannel = await this.authz.assertChannelReadable(channelId, userId);
    if (parentChannel.type === "THREAD") {
      throw new BadRequestException("Cannot branch a thread from another thread");
    }

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, channelId, deleted: false },
    });
    if (!message) throw new NotFoundException("Message not found");

    const existing = await this.prisma.channel.findUnique({
      where: { parentMessageId: messageId },
    });
    if (existing) {
      return {
        threadChannelId: existing.id,
        parentMessageId: messageId,
        parentChannelId: channelId,
        name: existing.name,
      };
    }

    const snippet = message.content.trim().slice(0, 80) || "Thread";
    const name = dto.name?.trim() || snippet;

    const thread = await this.prisma.channel.create({
      data: {
        serverId: parentChannel.serverId,
        name,
        type: "THREAD",
        parentMessageId: messageId,
        parentChannelId: channelId,
        position: 0,
      },
    });

    const info = {
      threadChannelId: thread.id,
      parentMessageId: messageId,
      parentChannelId: channelId,
      name: thread.name,
    };

    this.realtime.emitChannelEvent(channelId, "thread:created", info);
    return info;
  }

  toChannelResponse(channel: {
    id: string;
    serverId: string;
    name: string;
    topic: string | null;
    type: string;
    position: number;
    parentMessageId: string | null;
    parentChannelId: string | null;
    createdAt: Date;
  }): ChannelResponse {
    return {
      id: channel.id,
      serverId: channel.serverId,
      name: channel.name,
      topic: channel.topic,
      type: channel.type as ChannelResponse["type"],
      position: channel.position,
      parentMessageId: channel.parentMessageId,
      parentChannelId: channel.parentChannelId,
      createdAt: channel.createdAt.toISOString(),
    };
  }
}
