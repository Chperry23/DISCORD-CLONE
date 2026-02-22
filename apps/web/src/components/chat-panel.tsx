"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getMessages } from "@/lib/messages";
import { getSocket } from "@/lib/socket";
import type { MessageResponse, UserResponse } from "@discord-clone/shared";

interface Props {
  channelId: string;
  user: UserResponse | null;
}

export function ChatPanel({ channelId, user }: Props) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const page = await getMessages(channelId);
        if (!cancelled) {
          setMessages(page.messages);
          setTimeout(scrollToBottom, 100);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    const socket = getSocket();

    socket.emit("channel:join", { channelId });

    function onNewMessage(msg: MessageResponse) {
      if (msg.channelId !== channelId) return;
      setMessages((prev) => [...prev, msg]);
      setTimeout(scrollToBottom, 50);
    }

    function onUpdateMessage(msg: MessageResponse) {
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
    }

    function onDeleteMessage(data: { messageId: string }) {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    }

    function onTypingStart(data: { userId: string; username: string }) {
      if (data.userId === user?.id) return;
      setTypingUsers((prev) => new Map(prev).set(data.userId, data.username));
    }

    function onTypingStop(data: { userId: string }) {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    }

    socket.on("message:new", onNewMessage);
    socket.on("message:update", onUpdateMessage);
    socket.on("message:delete", onDeleteMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);

    return () => {
      cancelled = true;
      socket.emit("channel:leave", { channelId });
      socket.off("message:new", onNewMessage);
      socket.off("message:update", onUpdateMessage);
      socket.off("message:delete", onDeleteMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
    };
  }, [channelId, user?.id, scrollToBottom]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;

    const socket = getSocket();
    socket.emit("message:send", { channelId, content });
    socket.emit("typing:stop", { channelId });
    setInput("");
  }

  function handleInputChange(value: string) {
    setInput(value);

    const socket = getSocket();
    socket.emit("typing:start", { channelId });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { channelId });
    }, 2000);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  }

  const typingArray = Array.from(typingUsers.values());

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-4xl mb-3">&#128075;</div>
            <h3 className="text-lg font-bold">Welcome to the channel!</h3>
            <p className="text-sm text-surface-400">This is the start of something great. Send the first message.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const prevMsg = messages[i - 1];
          const showHeader =
            !prevMsg ||
            prevMsg.author.id !== msg.author.id ||
            new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 300000;

          const showDate =
            !prevMsg ||
            new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-2 my-4">
                  <div className="flex-1 border-t border-surface-700/50" />
                  <span className="text-[11px] font-semibold text-surface-400">{formatDate(msg.createdAt)}</span>
                  <div className="flex-1 border-t border-surface-700/50" />
                </div>
              )}

              <div className={`group flex gap-3 rounded-md px-2 py-0.5 hover:bg-surface-800/30 ${showHeader ? "mt-3" : ""}`}>
                {showHeader ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold mt-0.5">
                    {(msg.author.displayName ?? msg.author.username)[0]?.toUpperCase()}
                  </div>
                ) : (
                  <div className="w-10 shrink-0 flex items-center justify-center">
                    <span className="hidden text-[10px] text-surface-500 group-hover:block">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  {showHeader && (
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
                        {msg.author.displayName ?? msg.author.username}
                      </span>
                      <span className="text-[11px] text-surface-500">{formatTime(msg.createdAt)}</span>
                      {msg.editedAt && <span className="text-[10px] text-surface-600">(edited)</span>}
                    </div>
                  )}
                  <p className="text-sm text-surface-200 break-words whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingArray.length > 0 && (
        <div className="px-4 py-1 text-xs text-surface-400">
          <span className="font-semibold">{typingArray.join(", ")}</span>
          {typingArray.length === 1 ? " is" : " are"} typing...
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 px-4 pb-6 pt-2">
        <div className="flex items-center gap-2 rounded-lg border border-surface-600 bg-surface-800 px-4 py-2.5">
          <input
            type="text"
            className="flex-1 bg-transparent text-sm text-white placeholder-surface-400 outline-none"
            placeholder="Send a message..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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
  );
}
