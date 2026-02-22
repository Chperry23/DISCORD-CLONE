"use client";

import { useState } from "react";
import { createServer } from "@/lib/servers";
import { createServerSchema } from "@discord-clone/shared";
import { ApiError } from "@/lib/api";
import type { ServerResponse } from "@discord-clone/shared";

interface Props {
  onClose: () => void;
  onCreated: (server: ServerResponse) => void;
}

export function CreateServerModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const result = createServerSchema.safeParse({ name, description: description || undefined, visibility });
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    setLoading(true);
    try {
      const server = await createServer(result.data);
      onCreated(server);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card w-full max-w-md animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-2xl font-bold text-center">Create Your Server</h2>
        <p className="mb-6 text-center text-sm text-surface-400">
          Give your server a name and personality. You can change it later.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">
              Server Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="My Awesome Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">
              Description (optional)
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="What's this server about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-surface-300">Visibility</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setVisibility("PRIVATE")}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  visibility === "PRIVATE"
                    ? "border-brand-500 bg-brand-500/10 text-brand-400"
                    : "border-surface-600 bg-surface-800 text-surface-400 hover:border-surface-500"
                }`}
              >
                Private
              </button>
              <button
                type="button"
                onClick={() => setVisibility("PUBLIC")}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  visibility === "PUBLIC"
                    ? "border-brand-500 bg-brand-500/10 text-brand-400"
                    : "border-surface-600 bg-surface-800 text-surface-400 hover:border-surface-500"
                }`}
              >
                Public
              </button>
            </div>
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
              {loading ? "Creating..." : "Create Server"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
