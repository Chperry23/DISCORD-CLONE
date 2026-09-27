import { buildIceServersFromEnv } from "@discord-clone/shared";

describe("buildIceServersFromEnv", () => {
  it("defaults to local coturn STUN without Google STUN", () => {
    const servers = buildIceServersFromEnv({});
    expect(servers).toEqual([{ urls: "stun:localhost:3478" }]);
    expect(JSON.stringify(servers)).not.toContain("google");
  });

  it("parses ICE_SERVERS_JSON override", () => {
    const servers = buildIceServersFromEnv({
      ICE_SERVERS_JSON: '[{"urls":"stun:example.com:3478"}]',
    });
    expect(servers).toEqual([{ urls: "stun:example.com:3478" }]);
  });
});
