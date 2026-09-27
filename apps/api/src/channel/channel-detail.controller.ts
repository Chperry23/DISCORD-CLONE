import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ChannelService } from "./channel.service";

@Controller("channels")
@UseGuards(JwtAuthGuard)
export class ChannelDetailController {
  constructor(private readonly channelService: ChannelService) {}

  @Get(":channelId")
  get(@Param("channelId") channelId: string, @CurrentUser("id") userId: string) {
    return this.channelService.getForMember(channelId, userId);
  }
}
