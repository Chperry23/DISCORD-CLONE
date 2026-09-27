import { parseMentionUsernames } from "@discord-clone/shared";

describe("parseMentionUsernames", () => {
  it("extracts unique usernames case-insensitively", () => {
    expect(parseMentionUsernames("hey @Alice and @bob @Alice")).toEqual(["alice", "bob"]);
  });
});
