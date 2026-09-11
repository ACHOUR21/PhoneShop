"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { StockBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand?: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number;
}

const EMPTY = { sku: "", name: "", category: "general", brand: "", description: "", costPrice: "0", sellPrice: "0", quantity: "0", minQuantity: "5" };

export default function InventoryPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setFormState] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=100`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormState((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        costPrice: Number(form.costPrice) || 0,
        sellPrice: Number(form.sellPrice) || 0,
        quantity: Number(form.quantity) || 0,
        minQuantity: Number(form.minQuantity) || 0,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    toast.success(t("common.saved"));
    setDialogOpen(false);
    setFormState(EMPTY);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/products/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const products: ProductRow[] = data?.data ?? [];
  const stockValue = products.reduce((s, p) => s + p.quantity * p.costPrice, 0);

  return (
    <div>
      <PageHeader
        title={t("inventory.title")}
        description={`${t("inventory.subtitle")} — ${t("inventory.value")}: ${formatCurrency(stockValue)}`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("inventory.new")}
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : products.length === 0 ? (
        <EmptyState icon={<Package className="size-10" />} title={t("inventory.noProducts")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("inventory.sku")}</TableHead>
              <TableHead>{t("inventory.product")}</TableHead>
              <TableHead>{t("inventory.category")}</TableHead>
              <TableHead>{t("inventory.costPrice")}</TableHead>
              <TableHead>{t("inventory.sellPrice")}</TableHead>
              <TableHead>{t("inventory.quantity")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs" dir="ltr">{p.sku}</TableCell>
                <TableCell>
                  <p className="font-medium">{p.name}</p>
                  {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                </TableCell>
                <TableCell className="text-xs">{p.category}</TableCell>
                <TableCell className="text-xs">{formatCurrency(p.costPrice)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(p.sellPrice)}</TableCell>
                <TableCell className="font-bold">{p.quantity}</TableCell>
                <TableCell><StockBadge quantity={p.quantity} min={p.minQuantity} /></TableCell>
                <TableCell>
                  <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("inventory.new")}</DialogTitle>
          <DialogDescription>{t("inventory.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("inventory.sku")} *</Label>
              <Input value={form.sku} onChange={set("sku")} dir="ltr" required placeholder="ACC-001" />
            </div>
            <div className="space-y-1">
              <Label>{t("inventory.product")} *</Label>
              <Input value={form.name} onChange={set("name")} required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("inventory.category")}</Label>
              <Select value={form.category} onChange={set("category")}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("repairs.brand")}</Label>
              <Input value={form.brand} onChange={set("brand")} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("inventory.costPrice")}</Label>
              <Input type="number" min="0" value={form.costPrice} onChange={set("costPrice")} />
            </div>
            <div className="space-y-1">
              <Label>{t("inventory.sellPrice")}</Label>
              <Input type="number" min="0" value={form.sellPrice} onChange={set("sellPrice")} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("inventory.quantity")}</Label>
              <Input type="number" min="0" value={form.quantity} onChange={set("quantity")} />
            </div>
            <div className="space-y-1">
              <Label>{t("inventory.minQuantity")}</Label>
              <Input type="number" min="0" value={form.minQuantity} onChange={set("minQuantity")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("common.notes")}</Label>
            <Textarea value={form.description} onChange={set("description")} rows={2} />
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
