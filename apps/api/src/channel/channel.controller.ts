import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ChannelService } from "./channel.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { createChannelSchema, updateChannelSchema } from "@discord-clone/shared";
import type { CreateChannelDto, UpdateChannelDto } from "@discord-clone/shared";

@Controller("servers/:serverId/channels")
@UseGuards(JwtAuthGuard)
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post()
  async create(
    @Param("serverId") serverId: string,
    @Body(new ZodValidationPipe(createChannelSchema)) dto: CreateChannelDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.channelService.create(serverId, dto, userId);
  }

  @Get()
  async list(@Param("serverId") serverId: string) {
    return this.channelService.listForServer(serverId);
  }

  @Patch(":channelId")
  async update(
    @Param("channelId") channelId: string,
    @Body(new ZodValidationPipe(updateChannelSchema)) dto: UpdateChannelDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.channelService.update(channelId, dto, userId);
  }

  @Delete(":channelId")
  async remove(@Param("channelId") channelId: string, @CurrentUser("id") userId: string) {
    await this.channelService.delete(channelId, userId);
    return { message: "Channel deleted" };
  }
}
