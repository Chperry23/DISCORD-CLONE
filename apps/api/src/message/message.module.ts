import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MessageController } from "./message.controller";
import { AttachmentController } from "./attachment.controller";
import { MessageFeaturesController, PinListController } from "./message-features.controller";
import { MessageService } from "./message.service";
import { AttachmentService } from "./attachment.service";
import { ReactionService } from "./reaction.service";
import { PinService } from "./pin.service";
import { ThreadService } from "./thread.service";
import { ChatGateway } from "./chat.gateway";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthzModule } from "../authz/authz.module";
import { MetricsModule } from "../common/metrics/metrics.module";
import { DmModule } from "../dm/dm.module";
import { PresenceModule } from "../presence/presence.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [
    PrismaModule,
    AuthzModule,
    MetricsModule,
    DmModule,
    PresenceModule,
    RealtimeModule,
    NotificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [
    MessageController,
    AttachmentController,
    MessageFeaturesController,
    PinListController,
  ],
  providers: [
    MessageService,
    AttachmentService,
    ReactionService,
    PinService,
    ThreadService,
    ChatGateway,
  ],
})
export class MessageModule {}
