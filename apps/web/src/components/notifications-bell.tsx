"use client";

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import { listNotifications, markNotificationRead } from "@/lib/message-features";
import type { InAppNotificationResponse } from "@discord-clone/shared";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InAppNotificationResponse[]>([]);

  useEffect(() => {
    void listNotifications().then(setItems).catch(() => {});

    const socket = getSocket();
    function onNew(n: InAppNotificationResponse) {
      setItems((prev) => [n, ...prev].slice(0, 50));
    }
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  async function handleOpenItem(n: InAppNotificationResponse) {
    if (!n.readAt) {
      try {
        const updated = await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? updated : x)));
      } catch {
        /* ignore */
      }
    }
    if (n.serverId && n.channelId) {
      window.location.href = `/channels/${n.serverId}?channel=${n.channelId}`;
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-surface-400 hover:bg-surface-800 hover:text-white"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-surface-700 bg-surface-900 shadow-xl">
          <div className="border-b border-surface-700 px-3 py-2 text-xs font-semibold text-surface-400">
            In-app notifications
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-surface-500">No notifications</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void handleOpenItem(n)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-800 ${
                    n.readAt ? "text-surface-400" : "text-white"
                  }`}
                >
                  {n.summary}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
