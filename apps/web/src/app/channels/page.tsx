"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getConversations, getDmMessages, createConversation } from "@/lib/dm";
import { getMe } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { searchUsers } from "@/lib/users";
import { FriendsPanel } from "@/components/friends-panel";
import type { DmConversation, DmMessage } from "@/lib/dm";
import type { UserResponse, UserSearchResult } from "@discord-clone/shared";

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

type HomeView = "home" | "friends";

export default function ChannelsHome() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<DmConversation | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [homeView, setHomeView] = useState<HomeView>("home");
  const [dmSearch, setDmSearch] = useState("");
  const [dmSearchResults, setDmSearchResults] = useState<UserSearchResult[]>([]);
  const [input, setInput] = useState("");

  const refreshConversations = useCallback(async () => {
    const convos = await getConversations();
    setConversations(convos);
    setActiveConvo((prev) => {
      if (!prev) return prev;
      return convos.find((c) => c.id === prev.id) ?? prev;
    });
  }, []);

  useEffect(() => {
    Promise.all([refreshConversations(), getMe()])
      .then(([, u]) => setUser(u))
      .finally(() => setLoading(false));
  }, [refreshConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshConversations().catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshConversations]);

  useEffect(() => {
    if (dmSearch.trim().length < 2) {
      setDmSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchUsers(dmSearch.trim()).then(setDmSearchResults).catch(() => setDmSearchResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [dmSearch]);

  useEffect(() => {
    if (!activeConvo) return;
    const conversationId = activeConvo.id;
    const socket = getSocket();
    socket.emit("dm:join", { conversationId });

    function onDmMessage(msg: DmMessage) {
      if (msg.conversationId !== conversationId) {
        refreshConversations();
        return;
      }
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      refreshConversations();
    }

    socket.on("dm:message:new", onDmMessage);
    return () => {
      socket.emit("dm:leave", { conversationId });
      socket.off("dm:message:new", onDmMessage);
    };
  }, [activeConvo, refreshConversations]);

  const selectConvo = useCallback(async (convo: DmConversation) => {
    setHomeView("home");
    setActiveConvo(convo);
    const result = await getDmMessages(convo.id);
    setMessages(result.messages);
  }, []);

  const openConvoById = useCallback(
    async (conversationId: string) => {
      setHomeView("home");
      let convo = conversations.find((c) => c.id === conversationId);
      if (!convo) {
        await refreshConversations();
        const convos = await getConversations();
        convo = convos.find((c) => c.id === conversationId);
      }
      if (convo) await selectConvo(convo);
    },
    [conversations, refreshConversations, selectConvo],
  );

  const startDmWithUser = useCallback(
    async (targetUserId: string) => {
      const convo = await createConversation(targetUserId);
      await refreshConversations();
      await selectConvo(convo);
    },
    [refreshConversations, selectConvo],
  );

  useEffect(() => {
    const convoId = searchParams.get("conversation");
    const dmUser = searchParams.get("dmUser");
    if (convoId) {
      openConvoById(convoId).catch(() => undefined);
    } else if (dmUser) {
      startDmWithUser(dmUser).catch(() => undefined);
    }
  }, [searchParams, openConvoById, startDmWithUser]);

  async function handleSend() {
    if (!input.trim() || !activeConvo) return;
    const content = input.trim();
    setInput("");
    const socket = getSocket();
    socket.emit("dm:send", { conversationId: activeConvo.id, content });
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
      <div className="flex w-60 shrink-0 flex-col border-r border-surface-700/50 bg-surface-900/60">
        <div className="flex h-12 items-center border-b border-surface-700/50 px-4">
          <input
            className="w-full rounded-md bg-surface-800 px-3 py-1 text-sm text-surface-300 placeholder-surface-500 outline-none"
            placeholder="Find or start a conversation"
            value={dmSearch}
            onChange={(e) => setDmSearch(e.target.value)}
          />
        </div>
        {dmSearchResults.length > 0 && (
          <ul className="mx-2 mt-1 max-h-32 overflow-y-auto rounded-md border border-surface-700 bg-surface-900 text-xs">
            {dmSearchResults.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left hover:bg-surface-800"
                  onClick={() => {
                    setDmSearch("");
                    setDmSearchResults([]);
                    startDmWithUser(u.id);
                  }}
                >
                  {u.displayName ?? u.username}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="px-2 pt-3">
          <button
            type="button"
            onClick={() => {
              setHomeView("friends");
              setActiveConvo(null);
            }}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition ${
              homeView === "friends" ? "bg-surface-700/80 text-white" : "text-surface-300 hover:bg-surface-800/50 hover:text-white"
            }`}
          >
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
            const isActive = activeConvo?.id === c.id && homeView === "home";
            return (
              <button
                key={c.id}
                type="button"
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

      {homeView === "friends" ? (
        <FriendsPanel onOpenDm={openConvoById} />
      ) : activeConvo ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-surface-700/50 px-4">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(activeConvo.recipient?.id ?? "")}`}>
              {(activeConvo.recipient?.displayName ?? activeConvo.recipient?.username ?? "?")[0]?.toUpperCase()}
            </div>
            <span className="font-semibold text-sm">{activeConvo.recipient?.displayName ?? activeConvo.recipient?.username}</span>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
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
                type="button"
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
            <h1 className="mb-2 text-2xl font-bold">Welcome to Nexus</h1>
            <p className="text-surface-400">
              Select a server from the sidebar, open Friends, or start a direct message.
            </p>
            {user && <p className="mt-2 text-xs text-surface-500">Signed in as {user.username}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
