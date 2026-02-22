import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface TrackOptions {
  userId?: string | null;
  serverId?: string | null;
  payload?: Record<string, unknown>;
}

interface BufferedEvent {
  userId: string | null;
  serverId: string | null;
  name: string;
  payload: string;
  createdAt: Date;
}

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private buffer: BufferedEvent[] = [];
  private readonly BUFFER_SIZE = 50;
  private timer: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {
    this.timer = setInterval(() => this.flush(), 5_000);
  }

  track(name: string, opts: TrackOptions = {}): void {
    this.buffer.push({
      userId: opts.userId ?? null,
      serverId: opts.serverId ?? null,
      name,
      payload: JSON.stringify(opts.payload ?? {}),
      createdAt: new Date(),
    });

    if (this.buffer.length >= this.BUFFER_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    try {
      await this.prisma.analyticsEvent.createMany({ data: events });
    } catch (error) {
      this.logger.error("Failed to flush analytics events", error);
      this.buffer.unshift(...events);
    }
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.flush();
  }
}
