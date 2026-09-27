"use client";

import { useState } from "react";
import type { MemberResponse } from "@discord-clone/shared";
import { startProfileBadgeCheckout } from "@/lib/billing";

interface Props {
  member: MemberResponse;
  viewerUserId?: string | null;
  position?: { x: number; y: number };
  onClose: () => void;
  onMessage?: (userId: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  ADMIN: "bg-red-500/20 text-red-300 border-red-500/40",
  MODERATOR: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  MEMBER: "bg-surface-700/50 text-surface-300 border-surface-600",
};

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export function UserProfileCard({ member, viewerUserId, position, onClose, onMessage }: Props) {
  const [badgeBusy, setBadgeBusy] = useState(false);
  const [badgeMessage, setBadgeMessage] = useState<string | null>(null);
  const isSelf = viewerUserId != null && viewerUserId === member.userId;

  const style = position
    ? { top: Math.min(position.y, window.innerHeight - 350), left: Math.min(position.x + 10, window.innerWidth - 310) }
    : {};

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[300px] animate-slide-up overflow-hidden rounded-xl border border-surface-700/50 bg-surface-900 shadow-2xl"
        style={style}
      >
        {/* Banner */}
        <div className={`h-16 bg-gradient-to-r from-brand-600 to-brand-400`} />

        {/* Avatar + Info */}
        <div className="relative px-4 pb-4">
          <div className={`-mt-8 mb-3 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white ring-4 ring-surface-900 ${getAvatarColor(member.userId)}`}>
            {(member.user.displayName ?? member.user.username)[0]?.toUpperCase()}
          </div>

          <div className="mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              {member.nickname ?? member.user.displayName ?? member.user.username}
              {member.user.profileBadge ? (
                <span
                  className="rounded bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200"
                  title="Supporter badge"
                >
                  Supporter
                </span>
              ) : null}
            </h3>
            <p className="text-sm text-surface-400">@{member.user.username}</p>
          </div>

          {/* Role badge */}
          <div className="mb-3">
            <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? ROLE_COLORS.MEMBER}`}>
              {member.role}
            </span>
          </div>

          <div className="border-t border-surface-700/50 pt-3">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-surface-400">Member Since</p>
            <p className="text-xs text-surface-300">
              {new Date(member.joinedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {isSelf && !member.user.profileBadge ? (
              <button
                type="button"
                className="btn-primary w-full text-sm"
                disabled={badgeBusy}
                onClick={async () => {
                  setBadgeBusy(true);
                  setBadgeMessage(null);
                  try {
                    const session = await startProfileBadgeCheckout();
                    if (!session.configured) {
                      setBadgeMessage("Billing is not configured (see .env.example).");
                      return;
                    }
                    if (session.url) window.location.href = session.url;
                  } catch (err) {
                    setBadgeMessage(err instanceof Error ? err.message : "Checkout failed");
                  } finally {
                    setBadgeBusy(false);
                  }
                }}
              >
                {badgeBusy ? "Redirecting…" : "Get profile badge"}
              </button>
            ) : null}
            {badgeMessage ? <p className="text-xs text-amber-300">{badgeMessage}</p> : null}
            <button
              type="button"
              className="btn-secondary w-full text-sm"
              onClick={() => {
                onMessage?.(member.userId);
                onClose();
              }}
            >
              Message @{member.user.username}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
