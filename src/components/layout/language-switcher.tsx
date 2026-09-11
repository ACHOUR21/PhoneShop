"use client";

import { Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/hooks/use-translation";
import { LANGUAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg p-2 text-sm hover:bg-accent cursor-pointer"
        aria-label="Language"
      >
        <Globe className="size-5" />
        <span className="hidden sm:inline font-medium uppercase">{language}</span>
      </button>
      {open && (
        <div className="absolute end-0 top-full z-50 mt-1 w-40 rounded-lg border bg-background p-1 shadow-lg">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-accent",
                language === lang.code && "bg-accent font-semibold"
              )}
            >
              {lang.name}
              <span className="text-xs text-muted-foreground uppercase">{lang.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
