"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/use-translation";
import { LANGUAGES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { data: session, update } = useSession();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("profile");

  const [name, setName] = useState(session?.user?.name ?? "");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [twoFA, setTwoFA] = useState<{ enabled: boolean } | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");

  const { data: sessionsData } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => (await fetch("/api/sessions")).json(),
    enabled: tab === "sessions",
  });

  async function load2FA() {
    const res = await fetch("/api/2fa/status");
    if (res.ok) setTwoFA(await res.json());
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    await update?.({ name });
    toast.success(t("common.saved"));
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/users/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const d = await res.json();
    if (!res.ok) {
      toast.error(t("common.error"), { description: d.error ?? "Failed" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    toast.success(t("common.saved"));
  }

  async function start2FASetup() {
    const res = await fetch("/api/2fa/setup", { method: "POST" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    const d = await res.json();
    setQr(d.qr);
    setSetupOpen(true);
  }

  async function confirm2FA(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      toast.error(t("common.error"), { description: "Invalid code" });
      return;
    }
    setSetupOpen(false);
    setCode("");
    setTwoFA({ enabled: true });
    toast.success(t("common.saved"));
  }

  async function disable2FA() {
    const res = await fetch("/api/2fa/disable", { method: "POST" });
    if (!res.ok) {
      toast.error(t("common.error"));
      return;
    }
    setTwoFA({ enabled: false });
    toast.success(t("common.saved"));
  }

  async function revokeSession(id: string) {
    const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(t("common.deleted"));
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    }
  }

  return (
    <div>
      <PageHeader title={t("settings.title")} />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "security") load2FA(); }}>
        <TabsList>
          <TabsTrigger value="profile">{t("settings.profile")}</TabsTrigger>
          <TabsTrigger value="security">{t("settings.security")}</TabsTrigger>
          <TabsTrigger value="sessions">{t("settings.sessions")}</TabsTrigger>
          <TabsTrigger value="preferences">{t("settings.preferences")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserRound className="size-4" />{t("settings.profile")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-3">
                <div className="space-y-1">
                  <Label>{t("common.email")}</Label>
                  <Input value={session?.user?.email ?? ""} disabled dir="ltr" />
                </div>
                <div className="space-y-1">
                  <Label>{t("common.name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={session?.user?.name ?? ""} />
                </div>
                <div className="space-y-1">
                  <Label>{t("common.phone")}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
                </div>
                <Button type="submit">{t("settings.saveProfile")}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="grid gap-4 max-w-xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4" />{t("settings.twoFactor")}</CardTitle>
                <CardDescription>{t("settings.twoFactorDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {twoFA?.enabled ? (
                  <Button variant="destructive" onClick={disable2FA}>{t("settings.disable2FA")}</Button>
                ) : (
                  <Button onClick={start2FASetup}>{t("settings.enable2FA")}</Button>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.changePassword")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={changePassword} className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t("settings.currentPassword")}</Label>
                    <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("settings.newPassword")}</Label>
                    <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                  </div>
                  <Button type="submit">{t("common.save")}</Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MonitorSmartphone className="size-4" />{t("settings.currentSessions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(sessionsData?.sessions ?? []).map((s: { id: string; userAgent?: string; ip?: string; createdAt: string; revoked: boolean }) => (
                <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium" dir="ltr">{s.userAgent ?? "Unknown device"}</p>
                    <p className="text-xs text-muted-foreground">{s.ip ?? ""} — {formatDateTime(s.createdAt)}</p>
                  </div>
                  {!s.revoked && (
                    <Button size="sm" variant="outline" onClick={() => revokeSession(s.id)}>{t("settings.revoke")}</Button>
                  )}
                </div>
              ))}
              {(!sessionsData?.sessions || sessionsData.sessions.length === 0) && (
                <p className="text-sm text-muted-foreground">{t("common.noResults")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>{t("settings.preferences")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>{t("common.language")}</Label>
                <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Theme</Label>
                <Select value={theme ?? "system"} onChange={(e) => setTheme(e.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogHeader>
          <DialogTitle>{t("settings.enable2FA")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.scanQR")}</p>
          {qr && <img src={qr} alt="2FA QR" className="mx-auto size-48 rounded-lg border" />}
          <form onSubmit={confirm2FA} className="space-y-3">
            <div className="space-y-1">
              <Label>{t("settings.enterCode")}</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={8} dir="ltr" className="text-center font-mono text-lg tracking-widest" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSetupOpen(false)}>{t("common.cancel")}</Button>
              <Button type="submit">{t("settings.confirm")}</Button>
            </DialogFooter>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
