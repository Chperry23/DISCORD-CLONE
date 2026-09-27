import { IoAdapter } from "@nestjs/platform-socket.io";
import { INestApplication, Logger } from "@nestjs/common";
import { ServerOptions } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";

/**
 * Enables Socket.IO room fan-out across multiple API instances via Redis pub/sub.
 * Requires REDIS_URL (same cluster as presence and other Redis usage).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(private readonly app: INestApplication) {
    super(app);
  }

  async connectToRedis(url: string): Promise<void> {
    const pubClient = new Redis(url, { maxRetriesPerRequest: null });
    const subClient = pubClient.duplicate();

    pubClient.on("error", (err) => this.logger.error("Redis pub client error", err));
    subClient.on("error", (err) => this.logger.error("Redis sub client error", err));

    await Promise.all([pubClient.ping(), subClient.ping()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log("Socket.IO Redis adapter connected");
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
