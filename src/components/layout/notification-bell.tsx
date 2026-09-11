"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useTranslation } from "@/hooks/use-translation";
import { timeAgo } from "@/lib/utils";

export function NotificationBell() {
  const { t } = useTranslation();
  const { notifications, unread, connected, markAllRead } = useRealtimeNotifications(true);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 hover:bg-accent cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-80 max-w-[90vw] rounded-xl border bg-background shadow-xl">
          <div className="flex items-center justify-between border-b p-3">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">{t("notif.title")}</p>
              <span className={`flex items-center gap-1 text-xs ${connected ? "text-emerald-600" : "text-muted-foreground"}`}>
                <span className={`size-1.5 rounded-full ${connected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                {connected ? t("notif.live") : t("notif.offline")}
              </span>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline cursor-pointer">
                {t("notif.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("notif.empty")}</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/notifications"}
                  onClick={() => setOpen(false)}
                  className={`block border-b p-3 last:border-0 hover:bg-accent/50 ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t p-2.5 text-center text-sm font-medium text-primary hover:bg-accent/50 rounded-b-xl"
          >
            {t("dashboard.viewAll")}
          </Link>
        </div>
      )}
    </div>
  );
}
