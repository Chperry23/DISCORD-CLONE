import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AnalyticsCollector } from "../collector";
import { InMemoryTransport } from "../transports/in-memory";

describe("AnalyticsCollector", () => {
  let transport: InMemoryTransport;
  let collector: AnalyticsCollector;

  beforeEach(() => {
    transport = new InMemoryTransport();
    collector = new AnalyticsCollector({
      transports: [transport],
      flushIntervalMs: 0,
      bufferSize: 100,
    });
  });

  afterEach(async () => {
    await collector.shutdown();
  });

  it("should track and flush events", async () => {
    collector.track("user_registered", {
      userId: "user-1",
      payload: { method: "email" },
    });

    expect(collector.getBufferSize()).toBe(1);

    await collector.flush();

    expect(collector.getBufferSize()).toBe(0);
    expect(transport.events).toHaveLength(1);
    expect(transport.events[0]!.name).toBe("user_registered");
    expect(transport.events[0]!.userId).toBe("user-1");
    expect(transport.events[0]!.payload).toMatchObject({ method: "email" });
  });

  it("should auto-flush when buffer is full", async () => {
    const smallCollector = new AnalyticsCollector({
      transports: [transport],
      flushIntervalMs: 0,
      bufferSize: 2,
    });

    smallCollector.track("event_1");
    smallCollector.track("event_2");

    // Small delay for the async flush
    await new Promise((r) => setTimeout(r, 50));

    expect(transport.events).toHaveLength(2);
    await smallCollector.shutdown();
  });

  it("should merge global properties into events", async () => {
    const globalCollector = new AnalyticsCollector({
      transports: [transport],
      flushIntervalMs: 0,
      globalProperties: { appVersion: "1.0.0" },
    });

    globalCollector.track("test_event", { payload: { extra: true } });
    await globalCollector.flush();

    expect(transport.events[0]!.payload).toMatchObject({
      appVersion: "1.0.0",
      extra: true,
    });

    await globalCollector.shutdown();
  });

  it("should handle transport errors gracefully", async () => {
    const failingTransport = {
      send: async () => {
        throw new Error("Network error");
      },
    };

    const resilientCollector = new AnalyticsCollector({
      transports: [failingTransport],
      flushIntervalMs: 0,
    });

    resilientCollector.track("should_not_crash");
    await resilientCollector.flush(); // Should not throw
    await resilientCollector.shutdown();
  });

  it("should clear buffer on shutdown", async () => {
    collector.track("event_before_shutdown");
    await collector.shutdown();

    expect(collector.getBufferSize()).toBe(0);
    expect(transport.events).toHaveLength(1);
  });
});
