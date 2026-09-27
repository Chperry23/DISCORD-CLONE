import { Module } from "@nestjs/common";
import { ServerController } from "./server.controller";
import { ServerService } from "./server.service";
import { InviteController } from "./invite.controller";
import { InviteService } from "./invite.service";
import { MemberController } from "./member.controller";
import { MemberService } from "./member.service";
import { PresenceModule } from "../presence/presence.module";
import { ModerationModule } from "../moderation/moderation.module";

@Module({
  imports: [PresenceModule, ModerationModule],
  controllers: [ServerController, InviteController, MemberController],
  providers: [ServerService, InviteService, MemberService],
  exports: [ServerService, MemberService],
})
export class ServerModule {}
