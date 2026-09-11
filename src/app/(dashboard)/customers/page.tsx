"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { formatDate } from "@/lib/utils";

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  createdAt: string;
  _count: { repairs: number; sales: number };
}

export default function CustomersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setFormState] = useState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormState((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    toast.success(t("common.saved"));
    setDialogOpen(false);
    setFormState({ name: "", phone: "", email: "", address: "", city: "", notes: "" });
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/customers/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  }

  const customers: CustomerRow[] = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title={t("customers.title")}
        description={t("customers.subtitle")}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("customers.new")}
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : customers.length === 0 ? (
        <EmptyState icon={<Users className="size-10" />} title={t("customers.noCustomers")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("common.city")}</TableHead>
              <TableHead>{t("customers.totalRepairs")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.name}
                  </Link>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </TableCell>
                <TableCell dir="ltr" className="text-start">{c.phone}</TableCell>
                <TableCell>{c.city ?? "—"}</TableCell>
                <TableCell>{c._count.repairs}</TableCell>
                <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                <TableCell>
                  <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(c.id)}>
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
          <DialogTitle>{t("customers.new")}</DialogTitle>
          <DialogDescription>{t("customers.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("common.name")} *</Label>
              <Input value={form.name} onChange={set("name")} required />
            </div>
            <div className="space-y-1">
              <Label>{t("common.phone")} *</Label>
              <Input value={form.phone} onChange={set("phone")} dir="ltr" required />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("common.email")}</Label>
              <Input type="email" value={form.email} onChange={set("email")} dir="ltr" />
            </div>
            <div className="space-y-1">
              <Label>{t("common.city")}</Label>
              <Input value={form.city} onChange={set("city")} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("common.address")}</Label>
            <Input value={form.address} onChange={set("address")} />
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
