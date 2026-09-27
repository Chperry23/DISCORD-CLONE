import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("REDIS_URL", "redis://localhost:6379");
        return new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
