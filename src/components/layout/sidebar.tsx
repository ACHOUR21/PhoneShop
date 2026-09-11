"use client";

import {
  BarChart3,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/use-translation";
import { hasPermission, type Permission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; icon: typeof LayoutDashboard; labelKey: string; permission: Permission }[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard", permission: "dashboard.view" },
  { href: "/repairs", icon: Wrench, labelKey: "nav.repairs", permission: "repairs.view" },
  { href: "/customers", icon: Users, labelKey: "nav.customers", permission: "customers.view" },
  { href: "/sales", icon: ShoppingCart, labelKey: "nav.sales", permission: "sales.view" },
  { href: "/inventory", icon: Package, labelKey: "nav.inventory", permission: "inventory.view" },
  { href: "/purchase-orders", icon: ShoppingBag, labelKey: "nav.purchaseOrders", permission: "purchasing.view" },
  { href: "/expenses", icon: Wallet, labelKey: "nav.expenses", permission: "expenses.view" },
  { href: "/reports", icon: BarChart3, labelKey: "nav.reports", permission: "reports.view" },
  { href: "/users", icon: Users, labelKey: "nav.users", permission: "users.manage" },
  { href: "/settings", icon: Settings, labelKey: "nav.settings", permission: "settings.manage" },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "VIEWER";

  // Settings visible to everyone (profile prefs), users only for admins
  const items = NAV_ITEMS.filter(
    (item) => item.href === "/settings" || hasPermission(role, item.permission)
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 flex-col border-e bg-background transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={onClose}>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Smartphone className="size-5" />
            </span>
            <span className="font-bold text-lg">{t("app.name")}</span>
          </Link>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent lg:hidden cursor-pointer" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {t(item.labelKey)}
              </Link>
            );
          })}
          <Link
            href="/tracking"
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <FileText className="size-4 shrink-0" />
            {t("nav.tracking")}
          </Link>
        </nav>

        <div className="border-t p-3">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
          >
            <LogOut className="size-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
