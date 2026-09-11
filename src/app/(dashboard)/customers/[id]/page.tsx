"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, StatCard } from "@/components/ui/misc";
import { RepairStatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CustomerDetailPage() {
  const { t, dir } = useTranslation();
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-96" />;
  const customer = data?.customer;
  if (!customer) return <p className="text-destructive">{t("errors.404")}</p>;

  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div>
      <div className="mb-4">
        <Link href="/customers">
          <Button variant="outline" size="sm">
            <BackIcon className="size-4" />
            {t("common.back")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{customer.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{t("common.phone")}</span><span dir="ltr">{customer.phone}</span></div>
            {customer.email && <div className="flex justify-between"><span className="text-muted-foreground">{t("common.email")}</span><span>{customer.email}</span></div>}
            {customer.city && <div className="flex justify-between"><span className="text-muted-foreground">{t("common.city")}</span><span>{customer.city}</span></div>}
            {customer.address && <div className="flex justify-between"><span className="text-muted-foreground">{t("common.address")}</span><span>{customer.address}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">{t("customers.since")}</span><span>{formatDate(customer.createdAt)}</span></div>
            {customer.notes && <p className="rounded-lg bg-muted/50 p-2 text-xs">{customer.notes}</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title={t("customers.totalRepairs")} value={data.stats.repairs} icon={<span className="text-sm font-bold">🔧</span>} />
            <StatCard title={t("customers.totalSpent")} value={formatCurrency(data.stats.spent)} icon={<span className="text-sm font-bold">💰</span>} />
          </div>

          <CustomerTabs customer={customer} />
        </div>
      </div>
    </div>
  );
}

function CustomerTabs({ customer }: { customer: { repairs: unknown[]; sales: unknown[] } }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("repairs");
  const repairs = customer.repairs as { id: string; ticketNumber: string; brand: string; model: string; status: string; createdAt: string }[];
  const sales = customer.sales as { id: string; invoiceNumber: string; total: number; createdAt: string }[];

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="repairs">{t("customers.repairHistory")}</TabsTrigger>
        <TabsTrigger value="sales">{t("customers.purchaseHistory")}</TabsTrigger>
      </TabsList>
      <TabsContent value="repairs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("repairs.ticket")}</TableHead>
              <TableHead>{t("repairs.device")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/repairs/${r.id}`} className="font-mono text-xs text-primary hover:underline">{r.ticketNumber}</Link>
                </TableCell>
                <TableCell className="text-xs">{r.brand} {r.model}</TableCell>
                <TableCell><RepairStatusBadge status={r.status} /></TableCell>
                <TableCell className="text-xs">{formatDate(r.createdAt)}</TableCell>
              </TableRow>
            ))}
            {repairs.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("common.noResults")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TabsContent>
      <TabsContent value="sales">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("sales.invoice")}</TableHead>
              <TableHead>{t("common.total")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(s.total)}</TableCell>
                <TableCell className="text-xs">{formatDate(s.createdAt)}</TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t("common.noResults")}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  );
}
