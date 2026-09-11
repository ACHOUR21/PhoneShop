"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, FileText, Printer } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/misc";
import { PriorityBadge, RepairStatusBadge } from "@/components/ui/status-badge";
import { useTranslation } from "@/hooks/use-translation";
import { STATUS_TRANSITIONS, normalizeStatus, type RepairStatus } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function RepairDetailPage() {
  const { t, dir } = useTranslation();
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [editForm, setEditForm] = useState({ diagnosis: "", finalCost: "0", notes: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["repair", id],
    queryFn: async () => {
      const res = await fetch(`/api/repairs/${id}`);
      if (!res.ok) throw new Error("not found");
      return res.json();
    },
  });

  const repair = data?.repair;
  const currentStatus = repair ? normalizeStatus(repair.status) : ("RECEIVED" as RepairStatus);
  const allowedNext: RepairStatus[] = STATUS_TRANSITIONS[currentStatus] ?? [];

  async function handleStatusChange(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/repairs/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, note }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    toast.success(t("common.saved"));
    setStatusOpen(false);
    setNote("");
    queryClient.invalidateQueries({ queryKey: ["repair", id] });
    queryClient.invalidateQueries({ queryKey: ["repairs"] });
  }

  function openEdit() {
    setEditForm({
      diagnosis: repair.diagnosis ?? "",
      finalCost: String(repair.finalCost ?? 0),
      notes: repair.notes ?? "",
    });
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/repairs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis: editForm.diagnosis, finalCost: Number(editForm.finalCost) || 0, notes: editForm.notes }),
    });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    setEditOpen(false);
    queryClient.invalidateQueries({ queryKey: ["repair", id] });
  }

  if (isLoading) return <Skeleton className="h-96" />;
  if (!repair) return <p className="text-destructive">{t("errors.404")}</p>;

  const balance = (repair.finalCost || repair.estimatedCost) - (repair.deposit ?? 0);
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 no-print">
        <Link href="/repairs">
          <Button variant="outline" size="sm">
            <BackIcon className="size-4" />
            {t("common.back")}
          </Button>
        </Link>
        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t("common.print")}
          </Button>
          <Button variant="outline" size="sm" onClick={openEdit}>
            <FileText className="size-4" />
            {t("common.edit")}
          </Button>
          <Button size="sm" onClick={() => { setNewStatus(allowedNext[0] ?? ""); setStatusOpen(true); }}>
            {t("repairs.changeStatus")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-mono" dir="ltr">{repair.ticketNumber}</CardTitle>
              <div className="flex gap-2">
                <RepairStatusBadge status={repair.status} />
                <PriorityBadge priority={repair.priority} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">{t("repairs.customer")}</p>
                <Link href={`/customers/${repair.customer.id}`} className="font-semibold text-primary hover:underline">
                  {repair.customer.name}
                </Link>
                <p className="text-xs text-muted-foreground" dir="ltr">{repair.customer.phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("repairs.device")}</p>
                <p className="font-semibold">{t(`device.${repair.deviceType}`)} — {repair.brand} {repair.model}</p>
                {repair.serial && <p className="text-xs text-muted-foreground" dir="ltr">IMEI: {repair.serial}</p>}
              </div>
              <div>
                <p className="text-muted-foreground">{t("repairs.assigned")}</p>
                <p className="font-semibold">{repair.assignedTo?.name ?? t("repairs.unassigned")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("repairs.createdAt")}</p>
                <p className="font-semibold">{formatDateTime(repair.createdAt)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("repairs.issue")}</p>
              <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">{repair.issue}</p>
            </div>
            {repair.diagnosis && (
              <div>
                <p className="text-sm text-muted-foreground">{t("repairs.diagnosis")}</p>
                <p className="mt-1 rounded-lg bg-muted/50 p-3 text-sm">{repair.diagnosis}</p>
              </div>
            )}
            {repair.notes && (
              <div>
                <p className="text-sm text-muted-foreground">{t("common.notes")}</p>
                <p className="mt-1 text-sm">{repair.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("common.total")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("repairs.estimatedCost")}</span>
                <span className="font-semibold">{formatCurrency(repair.estimatedCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("repairs.finalCost")}</span>
                <span className="font-semibold">{formatCurrency(repair.finalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("repairs.deposit")}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(repair.deposit)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">{t("repairs.balance")}</span>
                <span className="font-bold text-primary">{formatCurrency(Math.max(0, balance))}</span>
              </div>
              {repair.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("repairs.dueDate")}</span>
                  <span>{formatDateTime(repair.dueDate)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("repairs.timeline")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-s ps-4">
                {(repair.history ?? []).map((h: { id: string; toStatus: string; fromStatus: string; createdAt: string; note?: string; changedBy?: { name: string } }) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -start-[21px] top-1 size-2.5 rounded-full bg-primary" />
                    <RepairStatusBadge status={h.toStatus} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(h.createdAt)}
                      {h.changedBy ? ` — ${h.changedBy.name}` : ""}
                    </p>
                    {h.note && <p className="mt-0.5 text-xs">{h.note}</p>}
                  </li>
                ))}
                {(!repair.history || repair.history.length === 0) && (
                  <p className="text-xs text-muted-foreground">{t("common.noResults")}</p>
                )}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogHeader>
          <DialogTitle>{t("repairs.changeStatus")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleStatusChange} className="space-y-3">
          <div className="space-y-1">
            <Label>{t("common.status")}</Label>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} required>
              <option value="">—</option>
              {allowedNext.map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("common.notes")} ({t("common.optional")})</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setStatusOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("common.save")}</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogHeader>
          <DialogTitle>{t("common.edit")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEdit} className="space-y-3">
          <div className="space-y-1">
            <Label>{t("repairs.diagnosis")}</Label>
            <Textarea value={editForm.diagnosis} onChange={(e) => setEditForm((f) => ({ ...f, diagnosis: e.target.value }))} rows={2} />
          </div>
          <div className="space-y-1">
            <Label>{t("repairs.finalCost")}</Label>
            <Input type="number" min="0" value={editForm.finalCost} onChange={(e) => setEditForm((f) => ({ ...f, finalCost: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>{t("common.notes")}</Label>
            <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("common.save")}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
