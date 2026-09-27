"use client";

import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket";
import type { ServerResponse, ChannelResponse, InviteResponse } from "@discord-clone/shared";

interface VoiceUser {
  userId: string;
  username: string;
  displayName: string | null;
  muted: boolean;
  deafened: boolean;
  screenSharing: boolean;
}

interface Props {
  server: ServerResponse;
  channels: ChannelResponse[];
  activeChannelId: string | null;
  isAdmin: boolean;
  onSelectChannel: (id: string) => void;
  onCreateChannel: (name: string, type: string) => void;
  onDeleteChannel: (id: string) => void;
  onCreateInvite: () => void;
  onLeave?: () => void;
  onOpenSettings?: () => void;
  invite: InviteResponse | null;
}

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export function ChannelSidebar({
  server,
  channels,
  activeChannelId,
  isAdmin,
  onSelectChannel,
  onCreateChannel,
  onDeleteChannel,
  onCreateInvite,
  onLeave,
  onOpenSettings,
  invite,
}: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("TEXT");
  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceUser[]>>({});

  useEffect(() => {
    const socket = getSocket();
    const voiceChannels = channels.filter((c) => c.type === "VOICE");

    function onVoiceState(data: { channelId: string; users: VoiceUser[] }) {
      setVoiceStates((prev) => ({ ...prev, [data.channelId]: data.users }));
    }

    socket.on("voice:state", onVoiceState);

    voiceChannels.forEach((ch) => {
      socket.emit("voice:get", { channelId: ch.id });
    });

    return () => {
      socket.off("voice:state", onVoiceState);
    };
  }, [channels]);

  function handleCreate() {
    if (!newName.trim()) return;
    const name = newType === "VOICE"
      ? newName.trim()
      : newName.trim().toLowerCase().replace(/\s+/g, "-");
    onCreateChannel(name, newType);
    setNewName("");
    setShowCreate(false);
  }

  const textChannels = channels.filter((c) => c.type === "TEXT" || c.type === "ANNOUNCEMENT");
  const voiceChannels = channels.filter((c) => c.type === "VOICE");

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-surface-700/50 bg-surface-900/60">
      {/* Server header */}
      <div className="flex h-12 items-center justify-between border-b border-surface-700/50 px-4">
        <h2 className="truncate font-bold text-sm">{server.name}</h2>
        <div className="flex gap-1">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition"
              title="Server Settings"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <button
            onClick={onCreateInvite}
            className="rounded p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition"
            title="Create Invite"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Invite banner */}
      {invite && (
        <div className="mx-2 mt-2 rounded-md bg-brand-500/10 border border-brand-500/30 p-2">
          <p className="text-xs text-brand-400 mb-1">Invite Code</p>
          <div className="flex items-center gap-1">
            <code className="flex-1 rounded bg-surface-800 px-2 py-1 text-xs font-mono">{invite.code}</code>
            <button
              onClick={() => navigator.clipboard.writeText(invite.code)}
              className="rounded bg-brand-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-brand-600"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto pt-4 px-2">
        {/* Text channels */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">Text Channels</span>
            {isAdmin && (
              <button
                onClick={() => { setNewType("TEXT"); setShowCreate(true); }}
                className="text-surface-400 hover:text-white transition"
                title="Create Channel"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
          {textChannels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onSelectChannel(ch.id)}
              className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition ${
                activeChannelId === ch.id
                  ? "bg-surface-700/80 text-white"
                  : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
              }`}
            >
              <span className="w-5 text-center text-surface-500 text-base leading-none">
                {ch.type === "ANNOUNCEMENT" ? "\u{1F4E2}" : "#"}
              </span>
              <span className="truncate flex-1 text-left">{ch.name}</span>
              {isAdmin && (
                <span
                  onClick={(e) => { e.stopPropagation(); onDeleteChannel(ch.id); }}
                  className="hidden text-surface-500 hover:text-red-400 group-hover:inline cursor-pointer text-xs"
                  title="Delete"
                >
                  &#10005;
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Voice channels */}
        <div>
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-surface-400">Voice Channels</span>
            {isAdmin && (
              <button
                onClick={() => { setNewType("VOICE"); setShowCreate(true); }}
                className="text-surface-400 hover:text-white transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
          {voiceChannels.map((ch) => {
            const users = voiceStates[ch.id] ?? [];
            return (
              <div key={ch.id}>
                <button
                  onClick={() => onSelectChannel(ch.id)}
                  className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm transition ${
                    activeChannelId === ch.id
                      ? "bg-surface-700/80 text-white"
                      : "text-surface-400 hover:bg-surface-800/50 hover:text-surface-200"
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <span className="truncate flex-1 text-left">{ch.name}</span>
                  {users.length > 0 && (
                    <span className="text-xs text-surface-500">{users.length}</span>
                  )}
                </button>
                {/* Connected voice users */}
                {users.length > 0 && (
                  <div className="ml-5 border-l border-surface-700/50 pl-2 pb-1">
                    {users.map((vu) => (
                      <div key={vu.userId} className="flex items-center gap-2 rounded-md px-1.5 py-0.5 text-xs text-surface-300">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${getAvatarColor(vu.userId)}`}>
                          {(vu.displayName ?? vu.username)[0]?.toUpperCase()}
                        </div>
                        <span className="truncate">{vu.displayName ?? vu.username}</span>
                        {vu.muted && (
                          <svg className="h-3 w-3 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        )}
                        {vu.screenSharing && (
                          <svg className="h-3 w-3 shrink-0 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {voiceChannels.length === 0 && (
            <p className="px-2 text-xs text-surface-600">No voice channels yet</p>
          )}
        </div>
      </div>

      {/* Create channel inline */}
      {showCreate && (
        <div className="border-t border-surface-700/50 p-3">
          <div className="mb-2 flex gap-2">
            <button
              onClick={() => setNewType("TEXT")}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                newType === "TEXT" ? "bg-brand-500/20 text-brand-400 border border-brand-500/40" : "bg-surface-800 text-surface-400 border border-surface-700"
              }`}
            >
              # Text
            </button>
            <button
              onClick={() => setNewType("VOICE")}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                newType === "VOICE" ? "bg-brand-500/20 text-brand-400 border border-brand-500/40" : "bg-surface-800 text-surface-400 border border-surface-700"
              }`}
            >
              Voice
            </button>
          </div>
          <input
            className="input-field text-sm mb-2"
            placeholder={newType === "VOICE" ? "Voice Channel Name" : "channel-name"}
            value={newName}
            onChange={(e) => {
              const val = newType === "VOICE"
                ? e.target.value
                : e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
              setNewName(val);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 text-xs py-1">Cancel</button>
            <button onClick={handleCreate} className="btn-primary flex-1 text-xs py-1">Create</button>
          </div>
        </div>
      )}

      {/* Leave button */}
      {onLeave && (
        <button
          onClick={onLeave}
          className="m-2 rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
        >
          Leave Server
        </button>
      )}
    </div>
  );
}
