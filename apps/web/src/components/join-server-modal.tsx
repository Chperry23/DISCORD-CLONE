"use client";

import { useState } from "react";
import { getInviteByCode, useInvite } from "@/lib/servers";
import { ApiError } from "@/lib/api";
import type { InviteResponse } from "@discord-clone/shared";

interface Props {
  onClose: () => void;
  onJoined: () => void;
}

export function JoinServerModal({ onClose, onJoined }: Props) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<InviteResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPreview(null);

    const trimmed = code.trim().split("/").pop() ?? code.trim();
    if (!trimmed) {
      setError("Enter an invite code or link");
      return;
    }

    setLoading(true);
    try {
      const invite = await getInviteByCode(trimmed);
      setPreview(invite);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invite not found");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!preview) return;
    setJoining(true);
    setError("");

    try {
      await useInvite(preview.code);
      onJoined();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to join server");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-2xl font-bold text-center">Join a Server</h2>
        <p className="mb-6 text-center text-sm text-surface-400">
          Enter an invite code to join an existing server.
        </p>

        {!preview ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-surface-300">
                Invite Code
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Abc12xyz"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? "Looking up..." : "Look Up Invite"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-lg border border-surface-600 bg-surface-800 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold">
                {preview.server.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{preview.server.name}</p>
                <p className="text-sm text-surface-400">
                  {preview.server.memberCount} member{preview.server.memberCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPreview(null)} className="btn-secondary flex-1">
                Back
              </button>
              <button onClick={handleJoin} disabled={joining} className="btn-primary flex-1">
                {joining ? "Joining..." : "Join Server"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
