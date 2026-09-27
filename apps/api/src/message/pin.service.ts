import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthzService } from "../authz/authz.service";
import { ConfigService } from "@nestjs/config";
import { RealtimeService } from "../realtime/realtime.service";
import { mapMessageToResponse, messageInclude } from "./message.mapper";
import type { MessageResponse } from "@discord-clone/shared";

const MAX_PINS_PER_CHANNEL = 50;

@Injectable()
export class PinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly config: ConfigService,
    private readonly realtime: RealtimeService,
  ) {}

  private apiBasePath(): string {
    const prefix = this.config.get<string>("API_GLOBAL_PREFIX") ?? "api";
    return `/${prefix}`;
  }

  async pin(channelId: string, messageId: string, userId: string): Promise<MessageResponse> {
    const channel = await this.authz.assertChannelReadable(channelId, userId);
    await this.authz.assertMemberRole(channel.serverId, userId, ["OWNER", "ADMIN"]);

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, channelId, deleted: false },
    });
    if (!message) throw new NotFoundException("Message not found");

    const count = await this.prisma.pinnedMessage.count({ where: { channelId } });
    if (count >= MAX_PINS_PER_CHANNEL) {
      throw new ForbiddenException("Pin limit reached for this channel");
    }

    await this.prisma.pinnedMessage.upsert({
      where: { messageId },
      create: { channelId, messageId, pinnedById: userId },
      update: { pinnedById: userId, pinnedAt: new Date() },
    });

    const updated = await this.prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude,
    });
    const response = mapMessageToResponse(updated, userId, this.apiBasePath());
    this.realtime.emitChannelEvent(channelId, "message:update", response);
    return response;
  }

  async unpin(channelId: string, messageId: string, userId: string): Promise<MessageResponse> {
    const channel = await this.authz.assertChannelReadable(channelId, userId);
    await this.authz.assertMemberRole(channel.serverId, userId, ["OWNER", "ADMIN"]);

    await this.prisma.pinnedMessage.deleteMany({ where: { channelId, messageId } });

    const updated = await this.prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude,
    });
    const response = mapMessageToResponse(updated, userId, this.apiBasePath());
    this.realtime.emitChannelEvent(channelId, "message:update", response);
    return response;
  }

  async listPins(channelId: string, userId: string): Promise<MessageResponse[]> {
    await this.authz.assertChannelReadable(channelId, userId);

    const pins = await this.prisma.pinnedMessage.findMany({
      where: { channelId },
      orderBy: { pinnedAt: "desc" },
      include: {
        message: { include: messageInclude },
      },
    });

    return pins
      .filter((p) => p.message && !p.message.deleted)
      .map((p) => mapMessageToResponse(p.message, userId, this.apiBasePath()));
  }
}
