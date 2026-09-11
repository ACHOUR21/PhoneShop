"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Monitor, Users, Wallet, Wrench } from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Skeleton, StatCard } from "@/components/ui/misc";
import { RepairStatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency, formatDate } from "@/lib/utils";

async function fetchStats() {
  const res = await fetch("/api/dashboard/stats");
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchStats });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive">{t("common.error")}</p>;
  }

  const maxStatus = Math.max(1, ...(data.repairsByStatus ?? []).map((s: { count: number }) => s.count));

  return (
    <div>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.revenue")}
          value={formatCurrency(data.revenueMonth ?? 0)}
          icon={<Wallet className="size-4" />}
          hint={`${t("dashboard.todaySales")}: ${formatCurrency(data.todaySales ?? 0)}`}
        />
        <StatCard
          title={t("dashboard.repairs")}
          value={data.activeRepairs ?? 0}
          icon={<Wrench className="size-4" />}
          hint={`${t("dashboard.pendingRepairs")}: ${data.pendingPickup ?? 0}`}
        />
        <StatCard
          title={t("dashboard.customers")}
          value={data.totalCustomers ?? 0}
          icon={<Users className="size-4" />}
        />
        <StatCard
          title={t("dashboard.lowStock")}
          value={data.lowStockCount ?? 0}
          icon={<AlertTriangle className="size-4" />}
          trend={(data.lowStockCount ?? 0) > 0 ? "down" : "neutral"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("dashboard.revenueChart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueByDay ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} width={60} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Area type="monotone" dataKey="total" stroke="#6d28d9" fill="#6d28d9" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.repairsByStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data.repairsByStatus ?? []).map((s: { status: string; count: number }) => (
              <div key={s.status} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <RepairStatusBadge status={s.status} />
                  <span className="font-semibold">{s.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(s.count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {(!data.repairsByStatus || data.repairsByStatus.length === 0) && (
              <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("dashboard.recentRepairs")}</CardTitle>
            <Link href="/repairs" className="text-sm text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("repairs.ticket")}</TableHead>
                  <TableHead>{t("repairs.device")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recentRepairs ?? []).map((r: { id: string; ticketNumber: string; brand: string; model: string; status: string }) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/repairs/${r.id}`} className="font-mono text-xs text-primary hover:underline">
                        {r.ticketNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.brand} {r.model}
                    </TableCell>
                    <TableCell>
                      <RepairStatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("dashboard.recentSales")}</CardTitle>
            <Link href="/sales" className="text-sm text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sales.invoice")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("common.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.recentSales ?? []).map((s: { id: string; invoiceNumber: string; createdAt: string; total: number }) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                    <TableCell className="text-xs">{formatDate(s.createdAt)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          title={t("dashboard.expenses")}
          value={formatCurrency(data.expensesMonth ?? 0)}
          icon={<Monitor className="size-4" />}
        />
        <StatCard
          title={t("dashboard.profit")}
          value={formatCurrency(data.profit ?? 0)}
          icon={<Wallet className="size-4" />}
          trend={(data.profit ?? 0) >= 0 ? "up" : "down"}
        />
      </div>
    </div>
  );
}
