export const MEMBER_ROLES = ["OWNER", "ADMIN", "MODERATOR", "MEMBER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** Lower number = higher privilege (matches kick hierarchy). */
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 0,
  ADMIN: 1,
  MODERATOR: 2,
  MEMBER: 3,
};

export function isMemberRole(role: string): role is MemberRole {
  return (MEMBER_ROLES as readonly string[]).includes(role);
}

export function hasAnyRole(memberRole: string, allowed: readonly string[]): boolean {
  return allowed.includes(memberRole);
}

export function roleRank(role: string): number {
  if (isMemberRole(role)) return ROLE_HIERARCHY[role];
  return 99;
}

/** Actor may kick target only if actor outranks target and actor can moderate. */
export function canKickMember(actorRole: string, targetRole: string): boolean {
  if (!hasAnyRole(actorRole, ["OWNER", "ADMIN", "MODERATOR"])) {
    return false;
  }
  return roleRank(actorRole) < roleRank(targetRole);
}

export function canModerate(actorRole: string): boolean {
  return hasAnyRole(actorRole, ["OWNER", "ADMIN", "MODERATOR"]);
}
