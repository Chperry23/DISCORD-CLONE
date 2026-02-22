import { Module } from "@nestjs/common";
import { ServerController } from "./server.controller";
import { ServerService } from "./server.service";
import { InviteController } from "./invite.controller";
import { InviteService } from "./invite.service";
import { MemberController } from "./member.controller";
import { MemberService } from "./member.service";

@Module({
  controllers: [ServerController, InviteController, MemberController],
  providers: [ServerService, InviteService, MemberService],
  exports: [ServerService, MemberService],
})
export class ServerModule {}
