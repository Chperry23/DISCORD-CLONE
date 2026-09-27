import { canKickMember, roleRank } from "./roles";

describe("@nexus/authz roles", () => {
  it("ranks OWNER above MEMBER", () => {
    expect(roleRank("OWNER")).toBeLessThan(roleRank("MEMBER"));
  });

  it("allows ADMIN to kick MODERATOR", () => {
    expect(canKickMember("ADMIN", "MODERATOR")).toBe(true);
  });

  it("denies MODERATOR kicking ADMIN", () => {
    expect(canKickMember("MODERATOR", "ADMIN")).toBe(false);
  });

  it("denies MEMBER kicking anyone", () => {
    expect(canKickMember("MEMBER", "MEMBER")).toBe(false);
  });
});
