import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis/redis.module";

const PRESENCE_TTL_SEC = 90;
const keyForUser = (userId: string) => `presence:user:${userId}`;

export type PresenceStatus = "online" | "offline";

@Injectable()
export class PresenceService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }

  async setOnline(userId: string): Promise<void> {
    await this.redis.set(
      keyForUser(userId),
      JSON.stringify({ status: "online" as const, at: Date.now() }),
      "EX",
      PRESENCE_TTL_SEC,
    );
  }

  async refresh(userId: string): Promise<void> {
    await this.setOnline(userId);
  }

  async setOffline(userId: string): Promise<void> {
    await this.redis.del(keyForUser(userId));
  }

  async getStatus(userId: string): Promise<PresenceStatus> {
    const raw = await this.redis.get(keyForUser(userId));
    return raw ? "online" : "offline";
  }

  async getStatuses(userIds: string[]): Promise<Record<string, PresenceStatus>> {
    if (userIds.length === 0) return {};
    const keys = userIds.map(keyForUser);
    const values = await this.redis.mget(...keys);
    const out: Record<string, PresenceStatus> = {};
    userIds.forEach((id, i) => {
      out[id] = values[i] ? "online" : "offline";
    });
    return out;
  }
}
