"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { POStatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PO {
  id: string;
  poNumber: string;
  supplier: string;
  status: string;
  subtotal: number;
  expectedDate?: string;
  createdAt: string;
  items: { id: string; name: string; quantity: number; unitCost: number; total: number }[];
}

export default function PurchaseOrdersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [supplier, setSupplier] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ name: "", quantity: 1, unitCost: 0 }]);

  const { data, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => (await fetch("/api/purchase-orders")).json(),
  });

  const orders: PO[] = data?.data ?? [];

  function updateItem(idx: number, k: string, v: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const cleanItems = items.filter((i) => i.name.trim());
    if (cleanItems.length === 0) {
      toast.error(t("sales.cartEmpty"));
      return;
    }
    const res = await fetch("/api/purchase-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplier, expectedDate: expectedDate || null, notes, items: cleanItems.map((i) => ({ name: i.name, quantity: Number(i.quantity) || 1, unitCost: Number(i.unitCost) || 0 })) }),
    });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    setDialogOpen(false);
    setSupplier("");
    setExpectedDate("");
    setNotes("");
    setItems([{ name: "", quantity: 1, unitCost: 0 }]);
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  }

  async function markReceived(id: string) {
    const res = await fetch(`/api/purchase-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RECEIVED", addToStock: true }),
    });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/purchase-orders/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
  }

  return (
    <div>
      <PageHeader
        title={t("po.title")}
        description={t("po.subtitle")}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("po.new")}
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-10" />} title={t("po.noOrders")} />
      ) : (
        <div className="grid gap-4">
          {orders.map((po) => (
            <Card key={po.id}>
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold" dir="ltr">{po.poNumber}</p>
                    <p className="text-sm font-medium">{po.supplier}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(po.createdAt)}
                      {po.expectedDate ? ` — ${t("po.expected")}: ${formatDate(po.expectedDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <POStatusBadge status={po.status} />
                    <span className="font-bold text-primary">{formatCurrency(po.subtotal)}</span>
                  </div>
                </div>
                <div className="mt-3 space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
                  {po.items.map((it) => (
                    <div key={it.id} className="flex justify-between">
                      <span>{it.name} × {it.quantity}</span>
                      <span>{formatCurrency(it.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  {po.status !== "RECEIVED" && po.status !== "CANCELLED" && (
                    <Button size="sm" variant="outline" onClick={() => markReceived(po.id)}>
                      <CheckCircle2 className="size-4" />
                      {t("po.markReceived")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(po.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("po.new")}</DialogTitle>
          <DialogDescription>{t("po.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("po.supplier")} *</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>{t("po.expected")}</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("sales.items")} *</Label>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <Input className="col-span-6" placeholder={t("common.name")} value={it.name} onChange={(e) => updateItem(idx, "name", e.target.value)} />
                <Input className="col-span-3" type="number" min="1" placeholder={t("sales.quantity")} value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                <Input className="col-span-3" type="number" min="0" placeholder={t("sales.unitPrice")} value={it.unitCost} onChange={(e) => updateItem(idx, "unitCost", e.target.value)} />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((p) => [...p, { name: "", quantity: 1, unitCost: 0 }])}>
              <Plus className="size-4" />
              {t("sales.addItem")}
            </Button>
          </div>
          <div className="space-y-1">
            <Label>{t("common.notes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("common.create")}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogHeader>
          <DialogTitle>{t("common.confirmDelete")}</DialogTitle>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
