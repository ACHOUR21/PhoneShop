"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/misc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/use-translation";
import { ROLE_LIST } from "@/lib/constants";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  twoFactorEnabled: boolean;
}

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setFormState] = useState({ name: "", email: "", password: "", role: "CASHIER" });

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await fetch("/api/users")).json(),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormState((f) => ({ ...f, [k]: e.target.value }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users", {
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
    setFormState({ name: "", email: "", password: "", role: "CASHIER" });
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  async function toggleActive(u: UserRow) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  async function changeRole(u: UserRow, role: string) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    toast.success(t("common.saved"));
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  const users: UserRow[] = data?.users ?? [];

  return (
    <div>
      <PageHeader
        title={t("users.title")}
        description={t("users.subtitle")}
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            {t("users.new")}
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : users.length === 0 ? (
        <EmptyState icon={<UsersIcon className="size-10" />} title={t("users.noUsers")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("common.role")}</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-xs" dir="ltr">{u.email}</TableCell>
                <TableCell>
                  <Select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="h-8 w-36 text-xs">
                    {ROLE_LIST.map((r) => (
                      <option key={r} value={r}>{t(`role.${r}`)}</option>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  {u.twoFactorEnabled ? <Badge variant="success">{t("settings.enabled")}</Badge> : <Badge variant="secondary">{t("settings.disabled")}</Badge>}
                </TableCell>
                <TableCell>
                  {u.active ? <Badge variant="success">{t("users.activate")}</Badge> : <Badge variant="destructive">{t("users.deactivate")}</Badge>}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>
                    {u.active ? t("users.deactivate") : t("users.activate")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{t("users.new")}</DialogTitle>
          <DialogDescription>{t("users.subtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="grid gap-3">
          <div className="space-y-1">
            <Label>{t("common.name")} *</Label>
            <Input value={form.name} onChange={set("name")} required />
          </div>
          <div className="space-y-1">
            <Label>{t("common.email")} *</Label>
            <Input type="email" dir="ltr" value={form.email} onChange={set("email")} required />
          </div>
          <div className="space-y-1">
            <Label>{t("auth.password")} *</Label>
            <Input type="password" value={form.password} onChange={set("password")} required minLength={6} />
          </div>
          <div className="space-y-1">
            <Label>{t("common.role")}</Label>
            <Select value={form.role} onChange={set("role")}>
              {ROLE_LIST.map((r) => (
                <option key={r} value={r}>{t(`role.${r}`)}</option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit">{t("common.create")}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
