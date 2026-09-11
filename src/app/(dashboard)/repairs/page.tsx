"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { PriorityBadge, RepairStatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { DEVICE_TYPES, REPAIR_PRIORITIES, REPAIR_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

interface RepairRow {
  id: string;
  ticketNumber: string;
  brand: string;
  model: string;
  deviceType: string;
  issue: string;
  status: string;
  priority: string;
  createdAt: string;
  customer: { name: string; phone: string };
  assignedTo: { name: string } | null;
}

export default function RepairsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerId: "",
    deviceType: "phone",
    brand: "",
    model: "",
    serial: "",
    issue: "",
    priority: "MEDIUM",
    assignedToId: "",
    estimatedCost: "0",
    deposit: "0",
    dueDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["repairs", search, status],
    queryFn: async () => {
      const params = new URLSearchParams({ search, status });
      const res = await fetch(`/api/repairs?${params}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => (await fetch("/api/customers?limit=200")).json(),
  });

  const { data: staffData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => (await fetch("/api/users?basic=1")).json(),
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/repairs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimatedCost: Number(form.estimatedCost) || 0,
        deposit: Number(form.deposit) || 0,
        assignedToId: form.assignedToId || null,
        dueDate: form.dueDate || null,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    toast.success(t("common.saved"));
    setDialogOpen(false);
    setForm({ customerId: "", deviceType: "phone", brand: "", model: "", serial: "", issue: "", priority: "MEDIUM", assignedToId: "", estimatedCost: "0", deposit: "0", dueDate: "" });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/repairs/${deleteId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.deleted"));
    setDeleteId(null);
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  const repairs: RepairRow[] = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title={t("repairs.title")}
        description={t("repairs.subtitle")}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("repairs.new")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">{t("common.all")}</option>
          {REPAIR_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status.${s}`)}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : repairs.length === 0 ? (
        <EmptyState icon={<FileText className="size-10" />} title={t("repairs.noRepairs")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("repairs.ticket")}</TableHead>
              <TableHead>{t("repairs.customer")}</TableHead>
              <TableHead>{t("repairs.device")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.priority")}</TableHead>
              <TableHead>{t("repairs.assigned")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {repairs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/repairs/${r.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                    {r.ticketNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="leading-tight">
                    <p className="font-medium text-xs">{r.customer.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{r.customer.phone}</p>
                  </div>
                </TableCell>
                <TableCell className="text-xs">
                  {t(`device.${r.deviceType}`)} — {r.brand} {r.model}
                </TableCell>
                <TableCell>
                  <RepairStatusBadge status={r.status} />
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={r.priority} />
                </TableCell>
                <TableCell className="text-xs">{r.assignedTo?.name ?? t("repairs.unassigned")}</TableCell>
                <TableCell className="text-xs">{formatDate(r.createdAt)}</TableCell>
                <TableCell>
                  <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(r.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("repairs.new")}</DialogTitle>
          <DialogDescription>{t("repairs.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("repairs.customer")} *</Label>
            <Select value={form.customerId} onChange={set("customerId")} required>
              <option value="">{t("repairs.selectCustomer")}</option>
              {(customersData?.data ?? []).map((c: { id: string; name: string; phone: string }) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.device")}</Label>
            <Select value={form.deviceType} onChange={set("deviceType")}>
              {DEVICE_TYPES.map((d) => (
                <option key={d} value={d}>{t(`device.${d}`)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("common.priority")}</Label>
            <Select value={form.priority} onChange={set("priority")}>
              {REPAIR_PRIORITIES.map((p) => (
                <option key={p} value={p}>{t(`priority.${p}`)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.brand")}</Label>
            <Input value={form.brand} onChange={set("brand")} placeholder="Samsung" />
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.model")}</Label>
            <Input value={form.model} onChange={set("model")} placeholder="Galaxy A55" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("repairs.serial")}</Label>
            <Input value={form.serial} onChange={set("serial")} dir="ltr" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("repairs.issue")} *</Label>
            <Textarea value={form.issue} onChange={set("issue")} required rows={2} />
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.estimatedCost")}</Label>
            <Input type="number" min="0" value={form.estimatedCost} onChange={set("estimatedCost")} />
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.deposit")}</Label>
            <Input type="number" min="0" value={form.deposit} onChange={set("deposit")} />
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.assigned")}</Label>
            <Select value={form.assignedToId} onChange={set("assignedToId")}>
              <option value="">{t("repairs.unassigned")}</option>
              {(staffData?.users ?? []).map((u: { id: string; name: string; role: string }) => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.dueDate")}</Label>
            <Input type="date" value={form.dueDate} onChange={set("dueDate")} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("common.create")}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete confirm */}
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
