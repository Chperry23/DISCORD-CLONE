import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { ServerModule } from "./server/server.module";
import { ChannelModule } from "./channel/channel.module";
import { MessageModule } from "./message/message.module";
import { DmModule } from "./dm/dm.module";
import { AuthzModule } from "./authz/authz.module";
import { MetricsModule } from "./common/metrics/metrics.module";
import { RedisModule } from "./redis/redis.module";
import { PresenceModule } from "./presence/presence.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { FriendsModule } from "./friends/friends.module";
import { UsersModule } from "./users/users.module";
import { StorageModule } from "./storage/storage.module";
import { NotificationModule } from "./notification/notification.module";
import { VoiceModule } from "./voice/voice.module";
import { ModerationModule } from "./moderation/moderation.module";
import { SearchModule } from "./search/search.module";
import { BillingModule } from "./billing/billing.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 1000, limit: 5 },
      { name: "medium", ttl: 10000, limit: 30 },
      { name: "long", ttl: 60000, limit: 100 },
    ]),
    PrismaModule,
    RedisModule,
    PresenceModule,
    RealtimeModule,
    AuthzModule,
    MetricsModule,
    AnalyticsModule,
    AuthModule,
    ServerModule,
    ChannelModule,
    MessageModule,
    DmModule,
    FriendsModule,
    UsersModule,
    StorageModule,
    NotificationModule,
    VoiceModule,
    ModerationModule,
    SearchModule,
    BillingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
