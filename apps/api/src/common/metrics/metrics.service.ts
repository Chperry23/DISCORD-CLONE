import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../../analytics/analytics.service";

@Injectable()
export class MetricsService {
  constructor(private readonly analytics: AnalyticsService) {}

  /** First-party RED-style timing + error events (no third-party trackers). */
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    opts: { userId?: string; serverId?: string } = {},
  ): Promise<T> {
    const started = Date.now();
    try {
      const result = await fn();
      this.analytics.track("api_operation_timing", {
        userId: opts.userId,
        serverId: opts.serverId,
        payload: {
          operation,
          durationMs: Date.now() - started,
          outcome: "ok",
        },
      });
      return result;
    } catch (error) {
      this.analytics.track("api_operation_timing", {
        userId: opts.userId,
        serverId: opts.serverId,
        payload: {
          operation,
          durationMs: Date.now() - started,
          outcome: "error",
          errorType: error instanceof Error ? error.constructor.name : "unknown",
        },
      });
      throw error;
    }
  }
}
