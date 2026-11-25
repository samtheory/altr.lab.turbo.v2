"use client";

import * as React from "react";
import { Check, Link2, Loader2, Unplug, X } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";
import { Button } from "./button";

export type OAuthScopeRisk = "low" | "medium" | "high";

export type OAuthScope = {
  id: string;
  label: string;
  description?: string;
  risk?: OAuthScopeRisk;
  required?: boolean;
};

export type OAuthConsentStatus = "pending" | "connecting" | "connected" | "denied";

export type OAuthConsentProps = {
  appName?: string;
  scopes?: OAuthScope[];
  status?: OAuthConsentStatus;
  onAllow?: (scopeIds: string[]) => void;
  onDeny?: () => void;
  onRevoke?: () => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO_SCOPES: OAuthScope[] = [
  {
    id: "read:profile",
    label: "Read profile",
    description: "Name, avatar, and email",
    risk: "low",
    required: true,
  },
  {
    id: "read:repos",
    label: "Read repositories",
    description: "Public and private repo metadata",
    risk: "medium",
  },
  {
    id: "write:issues",
    label: "Create issues",
    description: "Open issues on your behalf",
    risk: "high",
  },
];

const HOLD = 2800;
const TICK = 50;

const riskClass: Record<OAuthScopeRisk, string> = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-destructive",
};

/** OAuth-style scope consent with allow, deny, and revoke. */
export function OAuthConsent({
  appName = "Acme Agent",
  scopes: scopesProp,
  status: statusProp = "pending",
  onAllow,
  onDeny,
  onRevoke,
  autoPlay = false,
  className,
}: OAuthConsentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const scopes = scopesProp ?? (autoPlay ? DEMO_SCOPES : []);
  const LOOP = HOLD * 4;

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

  let status = statusProp;
  if (autoPlay) {
    const phase = Math.floor((reduce ? LOOP - 1 : tick) / HOLD);
    status =
      phase === 0
        ? "pending"
        : phase === 1
          ? "connecting"
          : phase === 2
            ? "connected"
            : "denied";
  }

  function allow() {
    const ids = scopes.filter((s) => s.required !== false).map((s) => s.id);
    onAllow?.(ids.length ? ids : scopes.map((s) => s.id));
  }

  return (
    <div
      ref={ref}
      data-slot="oauth-consent"
      data-status={status}
      className={cn(
        "w-full max-w-md rounded-xl border border-border bg-card p-4 text-foreground shadow-xs",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid size-10 place-items-center rounded-lg border border-border bg-muted">
          <Link2 className="size-4 text-muted-foreground" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold">{appName}</p>
          <p className="text-xs text-muted-foreground">Requests access to your account</p>
        </div>
        <span
          className={cn(
            "ml-auto inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium",
            status === "pending" && "bg-muted text-muted-foreground",
            status === "connecting" && "bg-info/15 text-info",
            status === "connected" && "bg-success/15 text-success",
            status === "denied" && "bg-destructive/15 text-destructive",
            status === "connecting" && !reduce && "apolyx-tool-shimmer",
          )}
        >
          {status === "pending"
            ? "Review"
            : status === "connecting"
              ? "Connecting"
              : status === "connected"
                ? "Connected"
                : "Denied"}
        </span>
      </div>

      <ul className="mb-3 space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        {scopes.map((scope) => (
          <li key={scope.id} className="flex gap-2 text-sm">
            <span className="mt-0.5 text-muted-foreground" aria-hidden>
              •
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-5">
                {scope.label}
                {scope.required ? (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    (required)
                  </span>
                ) : null}
              </p>
              {scope.description ? (
                <p className="text-xs text-muted-foreground">{scope.description}</p>
              ) : null}
            </div>
            {scope.risk ? (
              <span className={cn("shrink-0 text-[10px] font-medium uppercase", riskClass[scope.risk])}>
                {scope.risk}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {status === "pending" ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" className="flex-1" onClick={allow}>
            Allow access
          </Button>
          <Button type="button" size="sm" variant="outline" className="flex-1" onClick={onDeny}>
            Deny
          </Button>
        </div>
      ) : status === "connecting" ? (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
        >
          <Loader2 className={cn("size-3.5", !reduce && "animate-spin")} aria-hidden />
          Exchanging tokens…
        </motion.div>
      ) : status === "connected" ? (
        <div className="space-y-2">
          <p className="flex items-center justify-center gap-1.5 rounded-md bg-success/10 px-3 py-2 text-xs font-medium text-success">
            <Check className="size-3.5" aria-hidden />
            Connection active
          </p>
          {onRevoke ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onRevoke}
            >
              <Unplug className="size-3.5" aria-hidden />
              Revoke access
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="flex items-center justify-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          <X className="size-3.5" aria-hidden />
          Access was denied
        </p>
      )}
    </div>
  );
}