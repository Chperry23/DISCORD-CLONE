"use client";

import { useCallback, useEffect, useState } from "react";
import {
  acceptFriendRequest,
  listFriends,
  removeFriend,
  sendFriendRequest,
} from "@/lib/friends";
import { searchUsers } from "@/lib/users";
import { createConversation } from "@/lib/dm";
import type { FriendshipResponse } from "@discord-clone/shared";
import type { UserSearchResult } from "@discord-clone/shared";

interface Props {
  onOpenDm: (conversationId: string) => void;
}

export function FriendsPanel({ onOpenDm }: Props) {
  const [friends, setFriends] = useState<FriendshipResponse[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const rows = await listFriends();
    setFriends(rows);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchUsers(query.trim()).then(setResults).catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const accepted = friends.filter((f) => f.status === "ACCEPTED");
  const pending = friends.filter((f) => f.status === "PENDING");

  async function handleMessage(userId: string) {
    const convo = await createConversation(userId);
    onOpenDm(convo.id);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center border-b border-surface-700/50 px-4">
        <h2 className="font-semibold text-sm">Friends</h2>
      </header>

      <div className="border-b border-surface-700/50 p-4">
        <input
          className="w-full rounded-md bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-500 outline-none"
          placeholder="Search by username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="mt-2 max-h-40 overflow-y-auto rounded-md border border-surface-700 bg-surface-900">
            {results.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>{u.displayName ?? u.username}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-300"
                    onClick={() => sendFriendRequest(u.id).then(reload)}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="rounded bg-surface-700 px-2 py-0.5 text-xs"
                    onClick={() => handleMessage(u.id)}
                  >
                    Message
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {pending.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase text-surface-400">Pending — {pending.length}</h3>
            {pending.map((f) => (
              <div key={f.id} className="mb-2 flex items-center justify-between rounded-md bg-surface-800/50 px-3 py-2">
                <span className="text-sm">{f.user.displayName ?? f.user.username}</span>
                {f.direction === "incoming" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-brand-400"
                      onClick={() => acceptFriendRequest(f.id).then(reload)}
                    >
                      Accept
                    </button>
                    <button type="button" className="text-xs text-surface-500" onClick={() => removeFriend(f.id).then(reload)}>
                      Ignore
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-surface-500">Outgoing</span>
                )}
              </div>
            ))}
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase text-surface-400">
            All Friends — {accepted.length}
          </h3>
          {accepted.length === 0 && <p className="text-sm text-surface-500">No friends yet</p>}
          {accepted.map((f) => (
            <div key={f.id} className="mb-2 flex items-center justify-between rounded-md px-3 py-2 hover:bg-surface-800/40">
              <span className="text-sm font-medium">{f.user.displayName ?? f.user.username}</span>
              <div className="flex gap-2">
                <button type="button" className="text-xs text-brand-400" onClick={() => handleMessage(f.user.id)}>
                  Message
                </button>
                <button type="button" className="text-xs text-red-400/80" onClick={() => removeFriend(f.id).then(reload)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
