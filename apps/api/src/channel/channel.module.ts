import { Module } from "@nestjs/common";
import { ChannelController } from "./channel.controller";
import { ChannelDetailController } from "./channel-detail.controller";
import { ChannelService } from "./channel.service";
import { AuthzModule } from "../authz/authz.module";

@Module({
  imports: [AuthzModule],
  controllers: [ChannelController, ChannelDetailController],
  providers: [ChannelService],
  exports: [ChannelService],
})
export class ChannelModule {}
