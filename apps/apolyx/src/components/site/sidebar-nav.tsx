"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, cn } from "@altr/apolyx";

import { docHref, docsConfig } from "@/docs-config";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="space-y-6 text-sm">
      {docsConfig.map((group) => (
        <div key={group.title}>
          <h2 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.title}
          </h2>
          <ul className="space-y-0.5">
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
                      "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {item.title}
                    {item.status === "new" ? (
                      <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                        new
                      </Badge>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
