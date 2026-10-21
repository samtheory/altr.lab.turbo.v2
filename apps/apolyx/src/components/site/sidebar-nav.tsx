"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@altr/apolyx";

import { docHref, docsConfig, type DocGroup } from "@/docs-config";
import { DocStatusBadge } from "./doc-status-badge";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-2 text-sm">
      {docsConfig.map((group) => (
        <SidebarGroup key={group.title} group={group} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

function SidebarGroup({
  group,
  pathname,
  onNavigate,
}: {
  group: DocGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const regionId = useId();

  return (
    <div
      data-state={open ? "open" : "closed"}
      className={cn(
        "rounded-lg p-1 transition-colors duration-200 motion-reduce:transition-none",
        open ? "bg-muted/40" : "bg-transparent",
      )}
    >
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5",
            "text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors",
            "hover:bg-accent/60 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {group.title}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
        </button>
      </h2>
      <div
        id={regionId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <ul className="mt-1 mb-1 ml-3 space-y-0.5 border-l border-border pl-2">
            {group.items.map((item) => {
              const href = docHref(item.slug);
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "before:absolute before:inset-y-1 before:-left-[9px] before:w-px before:transition-colors",
                      active
                        ? "bg-accent font-medium text-accent-foreground before:bg-primary"
                        : "text-muted-foreground before:bg-transparent hover:bg-accent/60 hover:text-foreground hover:before:bg-foreground/40",
                    )}
                  >
                    {item.title}
                    <DocStatusBadge status={item.status} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
