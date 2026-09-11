"use client";

import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { Avatar } from "@/components/ui/misc";
import { LanguageSwitcher } from "./language-switcher";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

export function Header({ onMenu }: { onMenu: () => void }) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? "User";
  const role = (session?.user as { role?: string } | undefined)?.role;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 hover:bg-accent lg:hidden cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>
      <div className="ms-auto flex items-center gap-1 sm:gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell />
        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <Avatar name={name} />
          <div className="hidden sm:block leading-tight">
            <p className="text-sm font-medium max-w-28 truncate">{name}</p>
            {role && <p className="text-xs text-muted-foreground">{role}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
