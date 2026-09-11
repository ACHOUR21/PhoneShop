"use client";

import { BarChart3, Package, Search, ShoppingCart, Smartphone, Wrench } from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

const DEMO_ACCOUNTS = [
  { email: "admin@phoneshop.dz", password: "admin123", role: "ADMIN" },
  { email: "tech@phoneshop.dz", password: "tech123", role: "TECHNICIAN" },
  { email: "cashier@phoneshop.dz", password: "cashier123", role: "CASHIER" },
];

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    { icon: Wrench, title: t("landing.fRepairs"), desc: t("landing.fRepairsDesc") },
    { icon: ShoppingCart, title: t("landing.fPos"), desc: t("landing.fPosDesc") },
    { icon: Package, title: t("landing.fInventory"), desc: t("landing.fInventoryDesc") },
    { icon: BarChart3, title: t("landing.fReports"), desc: t("landing.fReportsDesc") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
            <Smartphone className="size-5" />
          </span>
          <span className="text-xl font-bold">{t("app.name")}</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href="/login">
            <Button size="sm" className="ms-2">{t("landing.login")}</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        <section className="py-12 text-center sm:py-20">
          <span className="inline-block rounded-full border bg-card px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
            {t("landing.badge")}
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t("landing.heroDesc")}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg">{t("landing.getStarted")}</Button>
            </Link>
            <Link href="/tracking">
              <Button size="lg" variant="outline">
                <Search className="size-4" />
                {t("landing.trackRepair")}
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mt-12">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-center text-xl font-bold">{t("landing.demoTitle")}</h2>
              <p className="mt-1 text-center text-sm text-muted-foreground">{t("landing.demoDesc")}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((a) => (
                  <div key={a.email} className="rounded-lg border bg-muted/40 p-4 text-sm" dir="ltr">
                    <p className="font-mono font-semibold text-primary">{a.role}</p>
                    <p className="mt-2 font-mono text-xs break-all">{a.email}</p>
                    <p className="font-mono text-xs text-muted-foreground">{a.password}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        {t("app.name")} © {new Date().getFullYear()} — {t("landing.footer")}
      </footer>
    </div>
  );
}
