"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { getMicStream, getAudioLevel } from "@/lib/media";
import { WebRTCManager } from "@/lib/webrtc";
import type { UserResponse } from "@discord-clone/shared";

interface VoiceUser {
  userId: string;
  username: string;
  displayName: string | null;
  muted: boolean;
  deafened: boolean;
  screenSharing: boolean;
}

interface Props {
  channelId: string;
  channelName: string;
  user: UserResponse | null;
}

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-cyan-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
  "bg-rose-500", "bg-teal-500", "bg-indigo-500", "bg-fuchsia-500",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

export function VoicePanel({ channelId, channelName, user }: Props) {
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);

  const rtcRef = useRef<WebRTCManager | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micLevelRef = useRef<(() => number) | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const isConnected = connected && voiceUsers.some((u) => u.userId === user?.id);

  useEffect(() => {
    const socket = getSocket();

    function onVoiceState(data: { channelId: string; users: VoiceUser[] }) {
      if (data.channelId === channelId) {
        setVoiceUsers(data.users);
      }
    }

    socket.on("voice:state", onVoiceState);
    socket.emit("voice:get", { channelId });

    return () => {
      socket.off("voice:state", onVoiceState);
    };
  }, [channelId]);

  useEffect(() => {
    for (const [userId, stream] of remoteAudioStreams) {
      if (deafened) {
        const el = audioElementsRef.current.get(userId);
        if (el) el.volume = 0;
        continue;
      }
      let el = audioElementsRef.current.get(userId);
      if (!el) {
        el = new Audio();
        el.autoplay = true;
        audioElementsRef.current.set(userId, el);
      }
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        el.volume = 1;
      }
    }

    for (const [userId, el] of audioElementsRef.current) {
      if (!remoteAudioStreams.has(userId)) {
        el.srcObject = null;
        audioElementsRef.current.delete(userId);
      }
    }
  }, [remoteAudioStreams, deafened]);

  useEffect(() => {
    function animateMicLevel() {
      if (micLevelRef.current) {
        setMicLevel(micLevelRef.current());
      }
      animFrameRef.current = requestAnimationFrame(animateMicLevel);
    }
    if (connected && !muted) {
      animFrameRef.current = requestAnimationFrame(animateMicLevel);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [connected, muted]);

  const handleConnect = useCallback(async () => {
    const socket = getSocket();

    try {
      const stream = await getMicStream();
      micStreamRef.current = stream;
      micLevelRef.current = getAudioLevel(stream);

      const rtc = new WebRTCManager(
        socket,
        channelId,
        (userId, remoteStream, kind) => {
          if (kind === "audio") {
            setRemoteAudioStreams((prev) => new Map(prev).set(userId, remoteStream));
          } else {
            setRemoteScreenStreams((prev) => new Map(prev).set(userId, remoteStream));
          }
        },
        (userId) => {
          setRemoteAudioStreams((prev) => { const m = new Map(prev); m.delete(userId); return m; });
          setRemoteScreenStreams((prev) => { const m = new Map(prev); m.delete(userId); return m; });
        },
      );

      rtc.setLocalMicStream(stream);
      rtcRef.current = rtc;

      socket.emit("voice:join", { channelId });
      setConnected(true);
      setMuted(false);
      setDeafened(false);
      setScreenSharing(false);
    } catch (err) {
      console.error("Failed to get microphone:", err);
      alert("Could not access microphone. Please allow microphone access and try again.");
    }
  }, [channelId]);

  const handleDisconnect = useCallback(() => {
    const socket = getSocket();
    socket.emit("voice:leave", { channelId });

    if (rtcRef.current) {
      rtcRef.current.destroy();
      rtcRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    micLevelRef.current = null;

    setConnected(false);
    setMuted(false);
    setDeafened(false);
    setScreenSharing(false);
    setLocalScreenStream(null);
    setRemoteAudioStreams(new Map());
    setRemoteScreenStreams(new Map());

    for (const el of audioElementsRef.current.values()) {
      el.srcObject = null;
    }
    audioElementsRef.current.clear();
  }, [channelId]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    setMuted(next);
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
    }
    getSocket().emit("voice:update", { channelId, muted: next });
  }, [channelId, muted]);

  const toggleDeafen = useCallback(() => {
    const next = !deafened;
    setDeafened(next);
    if (next && !muted) {
      setMuted(true);
      if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = false; });
      }
      getSocket().emit("voice:update", { channelId, deafened: next, muted: true });
    } else {
      getSocket().emit("voice:update", { channelId, deafened: next });
    }
  }, [channelId, deafened, muted]);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      rtcRef.current?.stopScreenShare();
      setScreenSharing(false);
      setLocalScreenStream(null);
      getSocket().emit("voice:update", { channelId, screenSharing: false });
    } else {
      try {
        const stream = await rtcRef.current?.startScreenShare();
        if (stream) {
          setScreenSharing(true);
          setLocalScreenStream(stream);
          getSocket().emit("voice:update", { channelId, screenSharing: true });

          stream.getVideoTracks()[0]?.addEventListener("ended", () => {
            setScreenSharing(false);
            setLocalScreenStream(null);
            getSocket().emit("voice:update", { channelId, screenSharing: false });
          });
        }
      } catch (err) {
        console.error("Screen share failed:", err);
      }
    }
  }, [channelId, screenSharing]);

  const activeScreenShare = localScreenStream
    ? { userId: user?.id ?? "", stream: localScreenStream, isLocal: true }
    : remoteScreenStreams.size > 0
      ? (() => { const [uid, s] = remoteScreenStreams.entries().next().value as [string, MediaStream]; return { userId: uid, stream: s, isLocal: false }; })()
      : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Screen share display */}
        {activeScreenShare && isConnected && (
          <div className="flex-1 bg-black p-2">
            <VideoTile stream={activeScreenShare.stream} label={activeScreenShare.isLocal ? "Your Screen" : `${voiceUsers.find((u) => u.userId === activeScreenShare.userId)?.displayName ?? "Screen"}'s Screen`} />
          </div>
        )}

        {/* User tiles */}
        <div className={`flex flex-wrap items-center justify-center gap-4 p-6 ${activeScreenShare && isConnected ? "shrink-0 border-t border-surface-700/50 bg-surface-900/50" : "flex-1"}`}>
          {voiceUsers.length === 0 && !isConnected ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-800/80 ring-2 ring-surface-700">
                <svg className="h-10 w-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h2 className="mb-1 text-xl font-bold">{channelName}</h2>
              <p className="mb-6 text-sm text-surface-400">No one is in this voice channel yet</p>
              <button onClick={handleConnect} className="btn-primary px-8 py-3 text-base">
                Join Voice Channel
              </button>
            </div>
          ) : (
            <>
              {!isConnected && voiceUsers.length > 0 && (
                <div className="w-full text-center mb-4">
                  <h2 className="mb-2 text-lg font-bold text-surface-300">{channelName}</h2>
                  <button onClick={handleConnect} className="btn-primary px-8 py-3 text-base">
                    Join Voice Channel
                  </button>
                </div>
              )}
              {voiceUsers.map((vu) => {
                const isMe = vu.userId === user?.id;
                const speaking = isMe && !muted && micLevel > 0.05;
                return (
                  <div key={vu.userId} className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <div
                        className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white transition-all ring-4 ${
                          vu.muted
                            ? "ring-red-500/40"
                            : speaking
                              ? "ring-green-400 ring-[6px]"
                              : vu.screenSharing
                                ? "ring-green-500/60"
                                : "ring-surface-600"
                        } ${getAvatarColor(vu.userId)}`}
                      >
                        {(vu.displayName ?? vu.username)[0]?.toUpperCase()}
                      </div>
                      {vu.muted && (
                        <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white">
                          <MicOffIcon />
                        </div>
                      )}
                      {vu.deafened && (
                        <div className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-white">
                          <DeafenIcon />
                        </div>
                      )}
                    </div>
                    <span className="max-w-[100px] truncate text-sm font-medium">
                      {vu.displayName ?? vu.username}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Voice controls */}
      {isConnected && (
        <div className="shrink-0 border-t border-surface-700/50 bg-surface-900/80 px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <ControlButton active={muted} danger={muted} onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
              {muted ? <MicOffIcon /> : <MicIcon />}
            </ControlButton>

            <ControlButton active={deafened} danger={deafened} onClick={toggleDeafen} label={deafened ? "Undeafen" : "Deafen"}>
              <HeadphoneIcon crossed={deafened} />
            </ControlButton>

            <ControlButton active={screenSharing} success={screenSharing} onClick={toggleScreenShare} label={screenSharing ? "Stop Sharing" : "Share Screen"}>
              <ScreenIcon />
            </ControlButton>

            <div className="mx-2 h-8 w-px bg-surface-700" />

            <ControlButton danger onClick={handleDisconnect} label="Disconnect">
              <PhoneOffIcon />
            </ControlButton>
          </div>

          {/* Mic level indicator */}
          {!muted && (
            <div className="mt-2 flex justify-center">
              <div className="h-1 w-32 overflow-hidden rounded-full bg-surface-700">
                <div
                  className="h-full rounded-full bg-green-400 transition-all duration-75"
                  style={{ width: `${Math.min(micLevel * 300, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VideoTile({ stream, label }: { stream: MediaStream; label: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-contain"
      />
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {label}
      </div>
    </div>
  );
}

function ControlButton({ children, onClick, label, active, danger, success }: {
  children: React.ReactNode; onClick: () => void; label: string;
  active?: boolean; danger?: boolean; success?: boolean;
}) {
  let cls = "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 ";
  if (danger && active) cls += "bg-red-500 text-white hover:bg-red-600";
  else if (danger && !active) cls += "bg-surface-700 text-red-400 hover:bg-red-500/20";
  else if (success) cls += "bg-green-500 text-white hover:bg-green-600";
  else if (active) cls += "bg-brand-500 text-white hover:bg-brand-600";
  else cls += "bg-surface-700 text-surface-300 hover:bg-surface-600";

  return <button onClick={onClick} className={cls} title={label}>{children}</button>;
}

function MicIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function HeadphoneIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      {crossed ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      )}
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
    </svg>
  );
}
