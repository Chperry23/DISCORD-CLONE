import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { BanService } from "./ban.service";
import { ModerationAuditService } from "./moderation-audit.service";
import { AuthzService } from "../authz/authz.service";
import {
  banMemberSchema,
  moderationAuditQuerySchema,
  type BanMemberDto,
} from "@discord-clone/shared";

@Controller("servers/:serverId/moderation")
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(
    private readonly bans: BanService,
    private readonly audit: ModerationAuditService,
    private readonly authz: AuthzService,
  ) {}

  @Get("bans")
  listBans(@Param("serverId") serverId: string, @CurrentUser("id") userId: string) {
    return this.bans.listBans(serverId, userId);
  }

  @Post("bans/:userId")
  ban(
    @Param("serverId") serverId: string,
    @Param("userId") targetUserId: string,
    @Body(new ZodValidationPipe(banMemberSchema)) dto: BanMemberDto,
    @CurrentUser("id") actorUserId: string,
  ) {
    return this.bans.ban(serverId, targetUserId, actorUserId, dto);
  }

  @Delete("bans/:userId")
  async unban(
    @Param("serverId") serverId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser("id") actorUserId: string,
  ) {
    await this.bans.unban(serverId, targetUserId, actorUserId);
    return { message: "Ban removed" };
  }

  @Get("audit")
  async auditLog(
    @Param("serverId") serverId: string,
    @CurrentUser("id") userId: string,
    @Query(new ZodValidationPipe(moderationAuditQuerySchema))
    query: { limit: number; cursor?: string },
  ) {
    await this.authz.assertMemberRole(serverId, userId, ["OWNER", "ADMIN", "MODERATOR"]);
    return this.audit.listForServer(serverId, query.limit, query.cursor);
  }
}
