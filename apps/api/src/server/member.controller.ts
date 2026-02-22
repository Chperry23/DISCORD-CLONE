import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { MemberService } from "./member.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { updateNicknameSchema } from "@discord-clone/shared";
import type { UpdateNicknameDto } from "@discord-clone/shared";

@Controller("servers/:serverId/members")
@UseGuards(JwtAuthGuard)
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  async list(@Param("serverId") serverId: string) {
    return this.memberService.listMembers(serverId);
  }

  @Get("me")
  async getMyMembership(
    @Param("serverId") serverId: string,
    @CurrentUser("id") userId: string,
  ) {
    return this.memberService.getMember(serverId, userId);
  }

  @Post("join")
  async join(@Param("serverId") serverId: string, @CurrentUser("id") userId: string) {
    return this.memberService.join(serverId, userId);
  }

  @Post("leave")
  async leave(@Param("serverId") serverId: string, @CurrentUser("id") userId: string) {
    await this.memberService.leave(serverId, userId);
    return { message: "Left the server" };
  }

  @Patch("me/nickname")
  async updateNickname(
    @Param("serverId") serverId: string,
    @Body(new ZodValidationPipe(updateNicknameSchema)) dto: UpdateNicknameDto,
    @CurrentUser("id") userId: string,
  ) {
    return this.memberService.updateNickname(serverId, userId, dto.nickname ?? null);
  }

  @Delete(":userId")
  async kick(
    @Param("serverId") serverId: string,
    @Param("userId") targetUserId: string,
    @CurrentUser("id") actorUserId: string,
  ) {
    await this.memberService.kick(serverId, targetUserId, actorUserId);
    return { message: "Member kicked" };
  }
}
