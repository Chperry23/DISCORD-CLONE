import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";
import { ChatGateway } from "./chat.gateway";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthzModule } from "../authz/authz.module";
import { MetricsModule } from "../common/metrics/metrics.module";
import { DmModule } from "../dm/dm.module";
import { PresenceModule } from "../presence/presence.module";

@Module({
  imports: [
    PrismaModule,
    AuthzModule,
    MetricsModule,
    DmModule,
    PresenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
      }),
    }),
  ],
  controllers: [MessageController],
  providers: [MessageService, ChatGateway],
})
export class MessageModule {}
