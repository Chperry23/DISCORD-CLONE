"use client";

import { useState } from "react";
import type { MemberResponse } from "@discord-clone/shared";
import { updateMemberRole } from "@/lib/servers";
import { startServerBoostCheckout } from "@/lib/billing";

interface Props {
  serverId: string;
  members: MemberResponse[];
  boostActive?: boolean;
  onClose: () => void;
  onUpdated: (members: MemberResponse[]) => void;
}

const ROLES = ["ADMIN", "MODERATOR", "MEMBER"] as const;

export function ServerSettingsModal({
  serverId,
  members,
  boostActive,
  onClose,
  onUpdated,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);
  const [boostMessage, setBoostMessage] = useState<string | null>(null);

  async function changeRole(member: MemberResponse, role: (typeof ROLES)[number]) {
    if (member.role === "OWNER") return;
    setBusy(member.userId);
    try {
      const updated = await updateMemberRole(serverId, member.userId, role);
      onUpdated(members.map((m) => (m.userId === updated.userId ? updated : m)));
    } finally {
      setBusy(null);
    }
  }

  async function purchaseBoost() {
    setBoostBusy(true);
    setBoostMessage(null);
    try {
      const session = await startServerBoostCheckout(serverId);
      if (!session.configured) {
        setBoostMessage("Billing is not configured in this environment (see .env.example).");
        return;
      }
      if (session.url) {
        window.location.href = session.url;
      }
    } catch (err) {
      setBoostMessage(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBoostBusy(false);
    }
  }

  const manageable = members.filter((m) => m.role !== "OWNER");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-surface-700 px-4 py-3">
          <h2 className="font-semibold">Server Settings</h2>
          <button type="button" className="text-surface-400 hover:text-white" onClick={onClose}>
            &#10005;
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          <section className="rounded-lg border border-surface-700/80 bg-surface-800/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Server Boost</h3>
              {boostActive ? (
                <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs text-brand-300">
                  Active
                </span>
              ) : null}
            </div>
            <p className="mb-3 text-xs text-surface-400">
              Optional cosmetic boost for this server. Core chat stays free for everyone.
            </p>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={boostBusy || boostActive}
              onClick={purchaseBoost}
            >
              {boostActive ? "Boost active" : boostBusy ? "Redirecting…" : "Boost this server"}
            </button>
            {boostMessage ? <p className="mt-2 text-xs text-amber-300">{boostMessage}</p> : null}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-surface-300">Member roles</h3>
            <div className="space-y-2">
              {manageable.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface-800/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {m.user.displayName ?? m.user.username}
                    </p>
                    <p className="text-xs text-surface-500">@{m.user.username}</p>
                  </div>
                  <select
                    className="rounded-md bg-surface-800 px-2 py-1 text-xs text-white"
                    value={m.role === "OWNER" ? "MEMBER" : m.role}
                    disabled={busy === m.userId || m.role === "OWNER"}
                    onChange={(e) => changeRole(m, e.target.value as (typeof ROLES)[number])}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
