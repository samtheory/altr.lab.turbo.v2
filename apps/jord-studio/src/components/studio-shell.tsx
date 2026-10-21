"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@altr/apolyx";

import { SessionBadge } from "@/components/session-badge";
import { StudioSideNav } from "@/components/studio-side-nav";
import type { JordRole } from "@/lib/auth/roles";

type Props = {
  children: React.ReactNode;
  role: JordRole;
  bypass: boolean;
};

export function StudioShell({ children, role, bypass }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-var(--jord-banner-h,0px))] flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:px-4">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,18rem)] p-0">
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle className="font-display">Jord Studio</SheetTitle>
            </SheetHeader>
            <StudioSideNav
              role={role}
              onNavigate={() => setMobileOpen(false)}
              className="max-h-[calc(100vh-4rem)]"
            />
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Jord Studio
        </Link>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          libSQL · table <code className="font-mono">records</code>
        </span>
        <SessionBadge role={role} bypass={bypass} />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/20 md:block lg:w-60">
          <StudioSideNav role={role} className="max-h-[calc(100vh-3.5rem)]" />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
