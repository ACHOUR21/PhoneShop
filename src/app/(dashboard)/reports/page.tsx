"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { useTranslation } from "@/hooks/use-translation";

const MODULES = [
  { key: "repairs", titleKey: "reports.repairs" },
  { key: "customers", titleKey: "reports.customers" },
  { key: "sales", titleKey: "reports.sales" },
  { key: "products", titleKey: "reports.products" },
  { key: "expenses", titleKey: "reports.expenses" },
  { key: "purchase-orders", titleKey: "reports.purchaseOrders" },
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  async function download(module: string) {
    setLoading(module);
    try {
      const res = await fetch(`/api/export/${module}`);
      if (!res.ok) {
        toast.error(t("common.error"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phoneshop-${module}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("common.success"));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Card key={m.key}>
            <CardHeader className="flex flex-row items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet className="size-5" />
              </span>
              <CardTitle className="text-base">{t(m.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => download(m.key)}
                disabled={loading === m.key}
              >
                <Download className="size-4" />
                {loading === m.key ? t("common.loading") : t("reports.download")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
