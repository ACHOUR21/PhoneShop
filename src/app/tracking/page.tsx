"use client";

import { PackageSearch, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RepairStatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface TrackResult {
  ticketNumber: string;
  deviceType: string;
  brand: string;
  model: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate?: string;
  estimatedCost: number;
  finalCost: number;
  deposit: number;
  history: { id: string; toStatus: string; createdAt: string }[];
}

export default function TrackingPage() {
  const { t } = useTranslation();
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!ticket.trim()) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(ticket.trim())}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      setResult((await res.json()).repair);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="mx-auto flex max-w-3xl items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Smartphone className="size-5" />
          </span>
          <span className="font-bold">{t("app.name")}</span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" variant="outline" className="ms-2">{t("landing.login")}</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        <div className="py-10 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PackageSearch className="size-7" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold">{t("repairs.trackTitle")}</h1>
          <p className="mt-2 text-muted-foreground">{t("repairs.trackDesc")}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleTrack} className="flex gap-2">
              <Input
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder={t("repairs.trackPlaceholder")}
                dir="ltr"
                className="font-mono"
              />
              <Button type="submit" disabled={loading}>
                {loading ? t("common.loading") : t("repairs.trackBtn")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {notFound && (
          <Card className="mt-4 border-destructive/40">
            <CardContent className="pt-6 text-center text-destructive">{t("repairs.notFound")}</CardContent>
          </Card>
        )}

        {result && (
          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="font-mono" dir="ltr">{result.ticketNumber}</CardTitle>
                <RepairStatusBadge status={result.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">{t("repairs.device")}</p>
                  <p className="font-semibold">{t(`device.${result.deviceType}`)} — {result.brand} {result.model}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("repairs.createdAt")}</p>
                  <p className="font-semibold">{formatDateTime(result.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("repairs.estimatedCost")}</p>
                  <p className="font-semibold">{formatCurrency(result.finalCost || result.estimatedCost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("repairs.deposit")}</p>
                  <p className="font-semibold text-emerald-600">{formatCurrency(result.deposit)}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">{t("repairs.timeline")}</p>
                <ol className="relative space-y-3 border-s ps-4">
                  {result.history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -start-[21px] top-1 size-2.5 rounded-full bg-primary" />
                      <RepairStatusBadge status={h.toStatus} />
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(h.createdAt)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
