"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ServerResponse, UserResponse } from "@discord-clone/shared";

interface ServerSidebarProps {
  servers: ServerResponse[];
  user: UserResponse | null;
  onCreateServer: () => void;
  onJoinServer: () => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export function ServerSidebar({
  servers,
  user,
  onCreateServer,
  onJoinServer,
  onLogout,
  onOpenSettings,
}: ServerSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-[72px] flex-col items-center bg-surface-950 py-3 gap-2">
      {/* Home button */}
      <Link
        href="/channels"
        className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 hover:rounded-xl ${
          pathname === "/channels"
            ? "rounded-xl bg-brand-500 text-white"
            : "bg-surface-700 text-surface-300 hover:bg-brand-500 hover:text-white"
        }`}
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <Tooltip text="Home" />
      </Link>

      <div className="mx-auto w-8 border-t border-surface-700" />

      {/* Server icons */}
      <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto scrollbar-hide">
        {servers.map((server) => {
          const isActive = pathname?.startsWith(`/channels/${server.id}`);
          return (
            <Link
              key={server.id}
              href={`/channels/${server.id}`}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 hover:rounded-xl ${
                isActive
                  ? "rounded-xl bg-brand-500 text-white"
                  : "bg-surface-700 text-surface-300 hover:bg-brand-500 hover:text-white"
              }`}
            >
              {server.iconUrl ? (
                <img
                  src={server.iconUrl}
                  alt={server.name}
                  className="h-full w-full rounded-[inherit] object-cover"
                />
              ) : (
                <span className="text-sm font-bold">
                  {server.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
              {isActive && (
                <span className="absolute -left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
              )}
              <Tooltip text={server.name} />
            </Link>
          );
        })}
      </div>

      <div className="mx-auto w-8 border-t border-surface-700" />

      {/* Action buttons */}
      <button
        onClick={onCreateServer}
        className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-700 text-green-400 transition-all duration-200 hover:rounded-xl hover:bg-green-500 hover:text-white"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <Tooltip text="Create Server" />
      </button>

      <button
        onClick={onJoinServer}
        className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-700 text-brand-400 transition-all duration-200 hover:rounded-xl hover:bg-brand-500 hover:text-white"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Tooltip text="Join Server" />
      </button>

      {/* User area */}
      <div className="mt-auto flex flex-col items-center gap-1 pt-2">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="group relative flex h-10 w-10 items-center justify-center rounded-full text-surface-400 transition hover:bg-surface-800 hover:text-white"
            title="User Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <Tooltip text="User Settings" />
          </button>
        )}

        <button
          onClick={onLogout}
          className="group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-700 transition-all duration-200 hover:rounded-xl hover:bg-red-500/20"
          title="Logout"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {user?.displayName?.[0]?.toUpperCase() ?? user?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <Tooltip text={`${user?.displayName ?? user?.username} (Logout)`} />
        </button>
      </div>
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-full ml-4 whitespace-nowrap rounded-md bg-surface-900 px-3 py-1.5 text-sm font-medium text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50">
      {text}
    </span>
  );
}
