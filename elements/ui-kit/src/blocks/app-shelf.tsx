"use client";

import * as React from "react";
import { motion } from "motion/react";
import { AppWindow } from "lucide-react";

import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type AppShelfItem = {
  id: string;
  name: string;
  icon?: React.ReactNode;
  color?: string;
};

export type AppShelfProps = {
  apps?: AppShelfItem[];
  className?: string;
};

const defaultApps: AppShelfItem[] = [
  { id: "studio", name: "Studio", color: "var(--primary)" },
  { id: "cloud", name: "Cloud", color: "var(--info)" },
  { id: "docs", name: "Docs", color: "var(--success)" },
  { id: "agents", name: "Agents", color: "var(--warning)" },
  { id: "charts", name: "Charts", color: "var(--destructive)" },
];

/** Horizontal shelf of app tiles with subtle hover lift. */
export function AppShelf({ apps = defaultApps, className }: AppShelfProps) {
  const reduce = useReducedMotion();

  return (
    <div
      data-slot="app-shelf"
      className={cn(
        "flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]",
        className,
      )}
      role="list"
      aria-label="Applications"
    >
      {apps.map((app, i) => (
        <motion.div
          key={app.id}
          role="listitem"
          className={cn(
            "flex min-w-[7.5rem] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border/80 bg-card/40 px-4 py-4 text-center shadow-sm",
            "transition-[border-color,box-shadow] duration-200 hover:border-primary/30",
          )}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reduce ? undefined : { y: -4, boxShadow: "0 12px 28px -14px color-mix(in oklch, var(--primary) 35%, transparent)" }}
        >
          <span
            className="grid size-11 place-items-center rounded-xl text-primary-foreground shadow-inner"
            style={{ background: app.color ?? "var(--muted)" }}
          >
            {app.icon ?? <AppWindow className="size-5" aria-hidden />}
          </span>
          <span className="text-sm font-medium tracking-tight">{app.name}</span>
        </motion.div>
      ))}
    </div>
  );
}