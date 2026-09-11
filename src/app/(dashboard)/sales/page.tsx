"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SaleStatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface Product {
  id: string;
  sku: string;
  name: string;
  sellPrice: number;
  quantity: number;
}

interface CartItem {
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export default function SalesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");

  const { data: productsData } = useQuery({
    queryKey: ["products-pos", search],
    queryFn: async () => (await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=50`)).json(),
  });

  const { data: salesData } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await fetch("/api/sales?limit=20")).json(),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await fetch("/api/customers?limit=200")).json(),
  });

  const products: Product[] = productsData?.data ?? [];
  const sales = salesData?.data ?? [];

  const subtotal = cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const paid = amountPaid === "" ? total : Number(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  function addToCart(p: Product) {
    if (p.quantity <= 0) {
      toast.error(t("inventory.outOfStock"));
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === p.id);
      if (existing) {
        if (existing.quantity + 1 > p.quantity) {
          toast.error(t("inventory.outOfStock"));
          return prev;
        }
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { productId: p.id, name: p.name, quantity: 1, unitPrice: p.sellPrice }];
    });
  }

  function updateQty(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((i, idx) => (idx === index ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  async function completeSale() {
    if (cart.length === 0) {
      toast.error(t("sales.cartEmpty"));
      return;
    }
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: customerId || null,
        items: cart,
        discount: Number(discount) || 0,
        paymentMethod,
        amountPaid: paid,
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    toast.success(t("common.success"), { description: d.sale.invoiceNumber });
    setCart([]);
    setDiscount("0");
    setAmountPaid("");
    setCustomerId("");
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    queryClient.invalidateQueries({ queryKey: ["products-pos"] });
  }

  return (
    <div>
      <PageHeader title={t("sales.title")} description={t("sales.subtitle")} />

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Product picker */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("sales.selectProduct")}</CardTitle>
            <div className="relative">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.quantity <= 0}
                  className="rounded-lg border p-3 text-start transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50 cursor-pointer"
                >
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(p.sellPrice)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("inventory.quantity")}: {p.quantity}
                  </p>
                </button>
              ))}
              {products.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground">{t("common.noResults")}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              {t("sales.items")} ({cart.reduce((s, i) => s + i.quantity, 0)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>{t("repairs.customer")} ({t("common.optional")})</Label>
              <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">—</option>
                {(customersData?.data ?? []).map((c: { id: string; name: string; phone: string }) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </Select>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto">
              {cart.length === 0 && <p className="text-center text-sm text-muted-foreground">{t("sales.cartEmpty")}</p>}
              {cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon-sm" variant="outline" onClick={() => updateQty(idx, -1)}><Minus className="size-3" /></Button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <Button size="icon-sm" variant="outline" onClick={() => updateQty(idx, 1)}><Plus className="size-3" /></Button>
                  </div>
                  <span className="w-20 text-end font-semibold">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  <Button size="icon-sm" variant="ghost" onClick={() => setCart((p) => p.filter((_, i) => i !== idx))}>
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>{t("common.discount")}</Label>
                <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("sales.paymentMethod")}</Label>
                <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{t(`payment.${m}`)}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("sales.amountPaid")}</Label>
              <Input type="number" min="0" placeholder={String(total)} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
            </div>

            <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between"><span>{t("common.subtotal")}</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>{t("common.discount")}</span><span>{formatCurrency(Number(discount) || 0)}</span></div>
              <div className="flex justify-between text-base font-bold"><span>{t("common.total")}</span><span className="text-primary">{formatCurrency(total)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>{t("sales.change")}</span><span>{formatCurrency(change)}</span></div>
            </div>

            <Button className="w-full" size="lg" onClick={completeSale} disabled={cart.length === 0}>
              {t("sales.complete")} — {formatCurrency(total)}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent sales */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("sales.today")}</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <EmptyState title={t("sales.noSales")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("sales.invoice")}</TableHead>
                  <TableHead>{t("repairs.customer")}</TableHead>
                  <TableHead>{t("common.total")}</TableHead>
                  <TableHead>{t("sales.paymentMethod")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((s: { id: string; invoiceNumber: string; customer?: { name: string }; total: number; paymentMethod: string; status: string; createdAt: string }) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoiceNumber}</TableCell>
                    <TableCell className="text-xs">{s.customer?.name ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(s.total)}</TableCell>
                    <TableCell className="text-xs">{t(`payment.${s.paymentMethod}`)}</TableCell>
                    <TableCell><SaleStatusBadge status={s.status} /></TableCell>
                    <TableCell className="text-xs">{formatDateTime(s.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
