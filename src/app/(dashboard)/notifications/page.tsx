"use client";

import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useTranslation } from "@/hooks/use-translation";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { notifications, connected, markAllRead, refresh } = useRealtimeNotifications(true);

  return (
    <div>
      <PageHeader
        title={t("notif.title")}
        description={connected ? t("notif.live") : t("notif.offline")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>{t("common.refresh")}</Button>
            <Button size="sm" onClick={markAllRead}>
              <CheckCheck className="size-4" />
              {t("notif.markAllRead")}
            </Button>
          </div>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="size-10" />} title={t("notif.empty")} />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {notifications.map((n) => (
              <Link key={n.id} href={n.link ?? "#"} className={`block p-4 hover:bg-accent/40 ${!n.read ? "bg-primary/[0.04]" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${!n.read ? "bg-primary" : "bg-muted"}`} />
                    <div>
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
