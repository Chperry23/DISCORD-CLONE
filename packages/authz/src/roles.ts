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

/** Same hierarchy as kick; bans are a stronger moderation action. */
export function canBanMember(actorRole: string, targetRole: string): boolean {
  return canKickMember(actorRole, targetRole);
}

export function canModerate(actorRole: string): boolean {
  return hasAnyRole(actorRole, ["OWNER", "ADMIN", "MODERATOR"]);
}

const ASSIGNABLE_ROLES: MemberRole[] = ["ADMIN", "MODERATOR", "MEMBER"];

/** OWNER/ADMIN may change another member's role (never to OWNER). */
export function canAssignMemberRole(
  actorRole: string,
  targetRole: string,
  newRole: string,
): boolean {
  if (!isMemberRole(newRole) || newRole === "OWNER") return false;
  if (!ASSIGNABLE_ROLES.includes(newRole)) return false;

  if (actorRole === "OWNER") {
    if (targetRole === "OWNER") return false;
    return true;
  }

  if (actorRole === "ADMIN") {
    if (!hasAnyRole(targetRole, ["MODERATOR", "MEMBER"])) return false;
    if (!hasAnyRole(newRole, ["MODERATOR", "MEMBER"])) return false;
    return true;
  }

  return false;
}
