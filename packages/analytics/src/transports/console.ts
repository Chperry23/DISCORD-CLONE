import type { AnalyticsTransport, TrackedEvent } from "../types";

/** Transport that logs events to stdout. Useful for dev. */
export class ConsoleTransport implements AnalyticsTransport {
  private prefix: string;

  constructor(prefix = "[analytics]") {
    this.prefix = prefix;
  }

  async send(event: TrackedEvent): Promise<void> {
    console.log(`${this.prefix} ${event.name}`, {
      userId: event.userId,
      serverId: event.serverId,
      payload: event.payload,
      createdAt: event.createdAt.toISOString(),
    });
  }
}
