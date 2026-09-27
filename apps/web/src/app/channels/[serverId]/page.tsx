"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getServer, getMembers, getMemberPresence, createInvite, leaveServer } from "@/lib/servers";
import { getSocket } from "@/lib/socket";
import { createConversation } from "@/lib/dm";
import { getChannels, createChannel, deleteChannel } from "@/lib/channels";
import { getMe } from "@/lib/auth";
import type {
  ServerResponse,
  MemberResponse,
  ChannelResponse,
  InviteResponse,
  UserResponse,
} from "@discord-clone/shared";
import { ChatPanel } from "@/components/chat-panel";
import { ChannelSidebar } from "@/components/channel-sidebar";
import { VoicePanel } from "@/components/voice-panel";
import { UserProfileCard } from "@/components/user-profile-card";
import { ServerSettingsModal } from "@/components/server-settings-modal";

export default function ServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.serverId as string;

  const [server, setServer] = useState<ServerResponse | null>(null);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [channels, setChannels] = useState<ChannelResponse[]>([]);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [showMembers, setShowMembers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profileMember, setProfileMember] = useState<{ member: MemberResponse; pos: { x: number; y: number } } | null>(null);
  const [presence, setPresence] = useState<Record<string, "online" | "offline">>({});
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, m, c, u, pres] = await Promise.all([
        getServer(serverId),
        getMembers(serverId),
        getChannels(serverId),
        getMe(),
        getMemberPresence(serverId),
      ]);
      setServer(s);
      setMembers(m);
      setChannels(c);
      setUser(u);
      setPresence(pres);

      const textChannels = c.filter((ch) => ch.type === "TEXT");
      if (textChannels.length > 0 && !activeChannelId) {
        setActiveChannelId(textChannels[0]!.id);
      }
    } catch {
      router.push("/channels");
    } finally {
      setLoading(false);
    }
  }, [serverId, router, activeChannelId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("presence:watch", { serverId });
    const heartbeat = setInterval(() => {
      socket.emit("presence:heartbeat");
    }, 30000);

    function onPresence(data: { userId: string; status: "online" | "offline" }) {
      setPresence((prev) => ({ ...prev, [data.userId]: data.status }));
    }

    socket.on("presence:update", onPresence);
    return () => {
      clearInterval(heartbeat);
      socket.off("presence:update", onPresence);
    };
  }, [serverId]);

  async function handleCreateChannel(name: string, type: string) {
    const ch = await createChannel(serverId, { name, type: type as "TEXT" | "VOICE" | "ANNOUNCEMENT" });
    setChannels((prev) => [...prev, ch]);
    if (ch.type === "TEXT") setActiveChannelId(ch.id);
  }

  async function handleDeleteChannel(channelId: string) {
    await deleteChannel(serverId, channelId);
    setChannels((prev) => prev.filter((c) => c.id !== channelId));
    if (activeChannelId === channelId) {
      const remaining = channels.filter((c) => c.id !== channelId && c.type === "TEXT");
      setActiveChannelId(remaining[0]?.id ?? null);
    }
  }

  async function handleCreateInvite() {
    const result = await createInvite(serverId, { expiresInHours: 24 });
    setInvite(result);
  }

  async function handleLeave() {
    if (!confirm("Are you sure you want to leave this server?")) return;
    await leaveServer(serverId);
    router.push("/channels");
  }

  function handleMemberClick(member: MemberResponse, e: React.MouseEvent) {
    setProfileMember({ member, pos: { x: e.clientX, y: e.clientY } });
  }

  async function handleMessageMember(targetUserId: string) {
    const convo = await createConversation(targetUserId);
    router.push(`/channels?conversation=${convo.id}`);
  }

  if (loading || !server) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const isOwner = server.ownerId === user?.id;
  const myMembership = members.find((m) => m.userId === user?.id);
  const isAdmin = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;

  const AVATAR_COLORS = [
    "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
    "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
  ];
  function getAvatarColor(userId: string): string {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <ChannelSidebar
        server={server}
        channels={channels}
        activeChannelId={activeChannelId}
        isAdmin={isAdmin}
        onSelectChannel={setActiveChannelId}
        onCreateChannel={handleCreateChannel}
        onDeleteChannel={handleDeleteChannel}
        onCreateInvite={handleCreateInvite}
        onLeave={isOwner ? undefined : handleLeave}
        onOpenSettings={isAdmin ? () => setShowSettings(true) : undefined}
        invite={invite}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Channel header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-surface-700/50 px-4">
          <div className="flex items-center gap-2">
            {activeChannel?.type === "VOICE" ? (
              <svg className="h-5 w-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <span className="text-surface-400">#</span>
            )}
            <span className="font-semibold">{activeChannel?.name ?? "No channel"}</span>
            {activeChannel?.topic && (
              <>
                <span className="text-surface-700">|</span>
                <span className="truncate text-sm text-surface-400">{activeChannel.topic}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeChannel?.type !== "VOICE" && (
              <button
                onClick={() => setShowMembers(!showMembers)}
                className={`rounded-md p-1.5 transition ${showMembers ? "bg-surface-700 text-white" : "text-surface-400 hover:text-white"}`}
                title="Toggle members"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {activeChannel && activeChannel.type === "TEXT" ? (
            <ChatPanel channelId={activeChannel.id} user={user} />
          ) : activeChannel?.type === "VOICE" ? (
            <VoicePanel channelId={activeChannel.id} channelName={activeChannel.name} user={user} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-surface-400">
              Select a channel to start chatting
            </div>
          )}

          {/* Members sidebar */}
          {showMembers && activeChannel?.type !== "VOICE" && (
            <aside className="hidden w-60 shrink-0 flex-col border-l border-surface-700/50 bg-surface-900/30 lg:flex">
              <div className="p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-400">
                  Members &mdash; {members.length}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-2">
                {["OWNER", "ADMIN", "MODERATOR", "MEMBER"].map((role) => {
                  const roleMembers = members.filter((m) => m.role === role);
                  if (roleMembers.length === 0) return null;
                  return (
                    <div key={role} className="mb-3">
                      <p className="mb-1 px-2 text-[11px] font-semibold uppercase text-surface-500">
                        {role} &mdash; {roleMembers.length}
                      </p>
                      {roleMembers.map((member) => (
                        <button
                          key={member.id}
                          onClick={(e) => handleMemberClick(member, e)}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-800/50 transition"
                        >
                          <div className="relative">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(member.userId)}`}>
                              {(member.user.displayName ?? member.user.username)[0]?.toUpperCase()}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-900 ${
                                presence[member.userId] === "online" ? "bg-green-500" : "bg-surface-600"
                              }`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {member.nickname ?? member.user.displayName ?? member.user.username}
                            </p>
                          </div>
                          {role === "OWNER" && <span className="text-yellow-400 text-xs">&#9733;</span>}
                          {role === "ADMIN" && <span className="text-red-400 text-xs">&#9733;</span>}
                          {role === "MODERATOR" && <span className="text-blue-400 text-xs">&#9733;</span>}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Profile card popup */}
      {profileMember && (
        <UserProfileCard
          member={profileMember.member}
          position={profileMember.pos}
          onClose={() => setProfileMember(null)}
          onMessage={handleMessageMember}
        />
      )}

      {showSettings && isAdmin && (
        <ServerSettingsModal
          serverId={serverId}
          members={members}
          onClose={() => setShowSettings(false)}
          onUpdated={setMembers}
        />
      )}
    </div>
  );
}
