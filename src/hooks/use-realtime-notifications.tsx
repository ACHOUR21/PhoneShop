"use client";

// SSE-primary realtime notifications with 30s polling fallback + auto-reconnect

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export function useRealtimeNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* offline */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchList();

    let source: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      try {
        source = new EventSource("/api/notifications/stream");
      } catch {
        scheduleRetry();
        return;
      }

      source.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
      };

      const onEvent = (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "ping") return;
          const item: RealtimeNotification = {
            id: `live-${Date.now()}`,
            title: payload.title ?? "Notification",
            message: payload.message ?? "",
            type: payload.data?.kind ?? "info",
            link: payload.link,
            read: false,
            createdAt: payload.timestamp ?? new Date().toISOString(),
          };
          setNotifications((prev) => [item, ...prev].slice(0, 30));
          setUnread((u) => u + 1);
          toast(item.title, { description: item.message });
        } catch {
          /* ignore malformed */
        }
      };

      for (const type of ["notification", "repair.updated", "repair.created", "sale.created", "stock.low"]) {
        source.addEventListener(type, onEvent as EventListener);
      }

      source.onerror = () => {
        setConnected(false);
        source?.close();
        scheduleRetry();
      };
    };

    const scheduleRetry = () => {
      if (stopped) return;
      retryRef.current += 1;
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(connect, delay);
    };

    connect();
    // 30s polling fallback keeps data fresh even if SSE drops
    const poll = setInterval(fetchList, 30000);

    return () => {
      stopped = true;
      source?.close();
      clearInterval(poll);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [enabled, fetchList]);

  return { notifications, unread, connected, refresh: fetchList, markAllRead };
}
