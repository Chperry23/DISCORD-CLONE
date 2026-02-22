"use client";

import { useEffect, useState } from "react";
import { getConversations, getDmMessages, sendDmMessage } from "@/lib/dm";
import { getMe } from "@/lib/auth";
import type { DmConversation, DmMessage } from "@/lib/dm";
import type { UserResponse } from "@discord-clone/shared";

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export default function ChannelsHome() {
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getConversations(), getMe()])
      .then(([convos, u]) => { setConversations(convos); setUser(u); })
      .finally(() => setLoading(false));
  }, []);

  async function selectConvo(convo: DmConversation) {
    setActiveConvo(convo);
    const result = await getDmMessages(convo.id);
    setMessages(result.messages);
  }

  async function handleSend() {
    if (!input.trim() || !activeConvo) return;
    const msg = await sendDmMessage(activeConvo.id, input.trim());
    setMessages((prev) => [...prev, msg]);
    setInput("");
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* DM sidebar */}
      <div className="flex w-60 shrink-0 flex-col border-r border-surface-700/50 bg-surface-900/60">
        <div className="flex h-12 items-center border-b border-surface-700/50 px-4">
          <input className="w-full rounded-md bg-surface-800 px-3 py-1 text-sm text-surface-300 placeholder-surface-500 outline-none" placeholder="Find or start a conversation" />
        </div>

        <div className="px-2 pt-3">
          <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium text-surface-300 transition hover:bg-surface-800/50 hover:text-white">
            <svg className="h-5 w-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Friends
          </button>
        </div>

        <p className="mt-4 px-4 text-[11px] font-semibold uppercase tracking-wide text-surface-400">Direct Messages</p>

        <div className="flex-1 overflow-y-auto px-2 pt-2">
          {conversations.length === 0 && (
            <p className="px-2 text-xs text-surface-500">No conversations yet</p>
          )}
          {conversations.map((c) => {
            const r = c.recipient;
            if (!r) return null;
            const isActive = activeConvo?.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => selectConvo(c)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition ${
                  isActive ? "bg-surface-700/80 text-white" : "text-surface-300 hover:bg-surface-800/50"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(r.id)}`}>
                  {(r.displayName ?? r.username)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.displayName ?? r.username}</p>
                  {c.lastMessage && (
                    <p className="truncate text-xs text-surface-500">{c.lastMessage.content}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      {activeConvo ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-surface-700/50 px-4">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(activeConvo.recipient?.id ?? "")}`}>
              {(activeConvo.recipient?.displayName ?? activeConvo.recipient?.username ?? "?")[0]?.toUpperCase()}
            </div>
            <span className="font-semibold text-sm">{activeConvo.recipient?.displayName ?? activeConvo.recipient?.username}</span>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold text-white ${getAvatarColor(activeConvo.recipient?.id ?? "")}`}>
                  {(activeConvo.recipient?.displayName ?? activeConvo.recipient?.username ?? "?")[0]?.toUpperCase()}
                </div>
                <h3 className="text-lg font-bold">{activeConvo.recipient?.displayName ?? activeConvo.recipient?.username}</h3>
                <p className="text-sm text-surface-400">This is the beginning of your direct message history.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="group flex gap-3 rounded-md px-2 py-1 hover:bg-surface-800/30">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(msg.author.id)}`}>
                  {(msg.author.displayName ?? msg.author.username)[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{msg.author.displayName ?? msg.author.username}</span>
                    <span className="text-[11px] text-surface-500">{formatTime(msg.createdAt)}</span>
                  </div>
                  <p className="text-sm text-surface-200">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 px-4 pb-6 pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-800 px-4 py-2.5">
              <input
                type="text"
                className="flex-1 bg-transparent text-sm text-white placeholder-surface-400 outline-none"
                placeholder={`Message @${activeConvo.recipient?.displayName ?? activeConvo.recipient?.username}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-30"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-800 text-4xl">
              &#127918;
            </div>
            <h1 className="mb-2 text-2xl font-bold">Welcome to Nexus</h1>
            <p className="text-surface-400">
              Select a server from the sidebar, start a conversation, or create a new server.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
