import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { InviteService } from "./invite.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { createInviteSchema } from "@discord-clone/shared";
import type { CreateInviteDto } from "@discord-clone/shared";

@Controller()
@UseGuards(JwtAuthGuard)
export class InviteController {
  constructor(private readonly inviteService: InviteService) {}

  @Post("servers/:serverId/invites")
  async create(
    @Param("serverId") serverId: string,
    @Body(new ZodValidationPipe(createInviteSchema)) dto: CreateInviteDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.inviteService.create(serverId, dto, userId);
  }

  @Get("servers/:serverId/invites")
  async listForServer(
    @Param("serverId") serverId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.inviteService.listForServer(serverId, userId);
  }

  @Delete("servers/:serverId/invites/:inviteId")
  async revoke(
    @Param("serverId") serverId: string,
    @Param("inviteId") inviteId: string,
    @CurrentUser("id") userId: string,
  ) {
    await this.inviteService.revoke(inviteId, serverId, userId);
    return { message: "Invite revoked" };
  }

  @Get("invites/:code")
  @SkipThrottle()
  async getByCode(@Param("code") code: string) {
    return this.inviteService.getByCode(code);
  }

  @Post("invites/:code/use")
  async useInvite(@Param("code") code: string, @CurrentUser("id") userId: string) {
    return this.inviteService.useInvite(code, userId);
  }
}
