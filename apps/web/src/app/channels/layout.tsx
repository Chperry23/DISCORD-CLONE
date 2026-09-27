"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMe, logout } from "@/lib/auth";
import { getMyServers } from "@/lib/servers";
import type { UserResponse, ServerResponse } from "@discord-clone/shared";
import { ServerSidebar } from "@/components/server-sidebar";
import { CreateServerModal } from "@/components/create-server-modal";
import { JoinServerModal } from "@/components/join-server-modal";
import { UserSettingsModal } from "@/components/user-settings-modal";
import { NotificationsBell } from "@/components/notifications-bell";

export default function ChannelsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [servers, setServers] = useState<ServerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userData, serverData] = await Promise.all([getMe(), getMyServers()]);
      setUser(userData);
      setServers(serverData);
    } catch {
      router.push("/auth/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleLogout() {
    await logout();
    router.push("/auth/login");
  }

  function handleServerCreated(server: ServerResponse) {
    setServers((prev) => [...prev, server]);
    setShowCreate(false);
    router.push(`/channels/${server.id}`);
  }

  function handleServerJoined() {
    setShowJoin(false);
    loadData();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      <ServerSidebar
        servers={servers}
        user={user}
        onCreateServer={() => setShowCreate(true)}
        onJoinServer={() => setShowJoin(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-10 shrink-0 items-center justify-end border-b border-surface-800/80 px-3">
          <NotificationsBell />
        </div>
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </main>

      {showCreate && (
        <CreateServerModal
          onClose={() => setShowCreate(false)}
          onCreated={handleServerCreated}
        />
      )}

      {showJoin && (
        <JoinServerModal
          onClose={() => setShowJoin(false)}
          onJoined={handleServerJoined}
        />
      )}

      {showSettings && user && (
        <UserSettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onUpdated={(updated) => setUser(updated)}
        />
      )}
    </div>
  );
}
