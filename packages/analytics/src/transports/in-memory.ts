import type { AnalyticsTransport, TrackedEvent } from "../types";

/** Transport that stores events in memory. Useful for testing. */
export class InMemoryTransport implements AnalyticsTransport {
  public events: TrackedEvent[] = [];

  async send(event: TrackedEvent): Promise<void> {
    this.events.push(event);
  }

  async flush(): Promise<void> {}

  clear(): void {
    this.events = [];
  }
}
