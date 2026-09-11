"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ExpenseRow {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paidBy?: string;
  notes?: string;
}

const EMPTY = { title: "", category: "general", amount: "", date: "", paidBy: "", notes: "" };

export default function ExpensesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setFormState] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await fetch("/api/expenses?limit=100")).json(),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFormState((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) || 0, date: form.date || undefined }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    toast.success(t("common.saved"));
    setDialogOpen(false);
    setFormState(EMPTY);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  const expenses: ExpenseRow[] = data?.data ?? [];
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader
        title={t("expense.title")}
        description={`${t("expense.subtitle")} — ${t("common.total")}: ${formatCurrency(total)}`}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("expense.new")}
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : expenses.length === 0 ? (
        <EmptyState icon={<Wallet className="size-10" />} title={t("expense.noExpenses")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("expense.category")}</TableHead>
              <TableHead>{t("expense.amount")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("expense.paidBy")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.title}</TableCell>
                <TableCell className="text-xs">{t(`expenseCat.${e.category}`)}</TableCell>
                <TableCell className="font-bold text-destructive">{formatCurrency(e.amount)}</TableCell>
                <TableCell className="text-xs">{formatDate(e.date)}</TableCell>
                <TableCell className="text-xs">{e.paidBy ?? "—"}</TableCell>
                <TableCell>
                  <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(e.id)}>
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
          <DialogTitle>{t("expense.new")}</DialogTitle>
          <DialogDescription>{t("expense.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="grid gap-3">
          <div className="space-y-1">
            <Label>{t("common.name")} *</Label>
            <Input value={form.title} onChange={set("title")} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("expense.category")}</Label>
              <Select value={form.category} onChange={set("category")}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`expenseCat.${c}`)}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("expense.amount")} *</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("common.date")}</Label>
              <Input type="date" value={form.date} onChange={set("date")} />
            </div>
            <div className="space-y-1">
              <Label>{t("expense.paidBy")}</Label>
              <Input value={form.paidBy} onChange={set("paidBy")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("common.notes")}</Label>
            <Textarea value={form.notes} onChange={set("notes")} rows={2} />
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
