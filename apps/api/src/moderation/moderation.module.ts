import { Module } from "@nestjs/common";
import { ModerationController } from "./moderation.controller";
import { BanService } from "./ban.service";
import { ModerationAuditService } from "./moderation-audit.service";
import { AuthzModule } from "../authz/authz.module";

@Module({
  imports: [AuthzModule],
  controllers: [ModerationController],
  providers: [BanService, ModerationAuditService],
  exports: [BanService, ModerationAuditService],
})
export class ModerationModule {}
