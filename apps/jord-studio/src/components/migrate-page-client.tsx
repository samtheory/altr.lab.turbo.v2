"use client";

import { useEffect } from "react";

import { useInspector } from "@/components/inspector-host";
import type { JordRole } from "@/lib/auth/roles";

/** Opens the migrate inspector on mount; content pane stays a short note. */
export function MigratePageClient({ role }: { role: JordRole }) {
  const { open, state } = useInspector();

  useEffect(() => {
    if (state?.id === "migrate") return;
    open("migrate");
  }, [open, state?.id]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Database
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        Migrate
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The migrate wizard opens in the right inspector. Role:{" "}
        <code className="font-mono">{role}</code>.
      </p>
    </div>
  );
}
