import { RedisIoAdapter } from "./redis-io.adapter";

describe("RedisIoAdapter", () => {
  it("exposes connectToRedis and createIOServer", () => {
    const app = {} as never;
    const adapter = new RedisIoAdapter(app);
    expect(typeof adapter.connectToRedis).toBe("function");
    expect(typeof adapter.createIOServer).toBe("function");
  });
});
