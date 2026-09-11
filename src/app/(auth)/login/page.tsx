"use client";

import { Smartphone } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        totpCode: needs2FA ? totpCode : undefined,
        redirect: false,
      });
      if (result?.error === "INVALID_2FA") {
        setNeeds2FA(true);
        toast.info(t("auth.twoFactor"), { description: t("auth.twoFactorDesc") });
        return;
      }
      if (result?.error) {
        toast.error(t("common.error"), { description: t("auth.invalid") });
        return;
      }
      // Record login session (fire and forget)
      fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAgent: navigator.userAgent }),
      }).catch(() => {});
      toast.success(t("auth.welcomeBack"));
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
          <Smartphone className="size-6" />
        </div>
        <CardTitle className="mt-4 text-2xl">{t("auth.welcomeBack")}</CardTitle>
        <CardDescription>{t("auth.loginDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              placeholder="admin@phoneshop.dz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={needs2FA}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.password")}</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                {t("auth.forgot")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={needs2FA}
            />
          </div>
          {needs2FA && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Label htmlFor="totp">{t("auth.twoFactor")}</Label>
              <Input
                id="totp"
                inputMode="numeric"
                maxLength={8}
                placeholder="123456"
                dir="ltr"
                className="text-center font-mono text-lg tracking-widest"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t("auth.twoFactorDesc")}</p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("common.loading") : needs2FA ? t("auth.verify") : t("auth.loginBtn")}
          </Button>
        </form>
        <div className="mt-4 space-y-2 text-center text-sm">
          <p className="text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t("auth.register")}
            </Link>
          </p>
          <Link href="/tracking" className="block text-primary hover:underline">
            {t("nav.tracking")}
          </Link>
        </div>
        <div className="mt-4 rounded-lg bg-muted/50 p-3 text-xs" dir="ltr">
          <p className="font-semibold mb-1">Demo:</p>
          <p className="font-mono">admin@phoneshop.dz / admin123</p>
        </div>
      </CardContent>
    </Card>
  );
}
