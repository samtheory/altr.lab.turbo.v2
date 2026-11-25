"use client";

import * as React from "react";
import { Cable, Circle, Plug } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type McpServerStatus = "connected" | "disconnected" | "error";

export type McpServer = {
  id: string;
  name: string;
  description?: string;
  status?: McpServerStatus;
  connected?: boolean;
};

export type McpServersProps = {
  title?: string;
  servers?: McpServer[];
  onToggle?: (serverId: string, connected: boolean) => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO: McpServer[] = [
  { id: "github", name: "GitHub", description: "Issues and PRs", status: "connected", connected: true },
  { id: "linear", name: "Linear", description: "Tasks", status: "disconnected", connected: false },
  { id: "postgres", name: "Postgres", description: "Read-only SQL", status: "error", connected: false },
];

const TICK = 50;
const HOLD = 2800;

/** Presentational list of MCP servers with status and connect toggles. */
export function McpServers({
  title = "MCP servers",
  servers: serversProp,
  onToggle,
  autoPlay = false,
  className,
}: McpServersProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const base = serversProp ?? DEMO;
  const LOOP = HOLD * base.length;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !visible || reduce) return;
    const id = setInterval(() => setTick((t) => (t + TICK) % LOOP), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce, LOOP]);

  const pulseIndex = autoPlay && !reduce ? Math.floor((tick % LOOP) / HOLD) : -1;

  const statusTone: Record<McpServerStatus, string> = {
    connected: "text-success",
    disconnected: "text-muted-foreground",
    error: "text-destructive",
  };

  return (
    <div
      ref={ref}
      data-slot="mcp-servers"
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-3 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <Cable className="size-4 text-muted-foreground" aria-hidden />
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {base.map((server, i) => {
          const status = server.status ?? (server.connected ? "connected" : "disconnected");
          const connected = server.connected ?? status === "connected";
          return (
            <motion.li
              key={server.id}
              layout={!reduce}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border px-2.5 py-2",
                pulseIndex === i && "border-primary/30 bg-muted/50",
              )}
            >
              <Plug className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{server.name}</p>
                {server.description ? (
                  <p className="truncate text-[11px] text-muted-foreground">{server.description}</p>
                ) : null}
              </div>
              <span
                className={cn("inline-flex items-center gap-1 text-[11px] font-medium", statusTone[status])}
              >
                <Circle className="size-2 fill-current" aria-hidden />
                {status}
              </span>
              <Button
                type="button"
                size="sm"
                variant={connected ? "secondary" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => onToggle?.(server.id, !connected)}
              >
                {connected ? "Disconnect" : "Connect"}
              </Button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}