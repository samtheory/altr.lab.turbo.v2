"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Badge,
  NavList,
  NavListGroup,
  NavListItem,
  ScrollArea,
  cn,
} from "@altr/apolyx";

import { useProjectSlug } from "@/hooks/use-project-path";
import type { JordRole } from "@/lib/auth/roles";
import {
  DEFAULT_PROJECT_SLUG,
  extractProjectRestPath,
  extractProjectSlug,
} from "@/lib/project-scope";
import { navForRole } from "@/lib/studio-nav";

type Props = {
  role: JordRole;
  onNavigate?: () => void;
  className?: string;
};

function isActive(pathname: string, href: string): boolean {
  const pathProject = extractProjectSlug(pathname);
  const hrefProject = extractProjectSlug(href);
  const pathRest = pathProject
    ? extractProjectRestPath(pathname) || "/"
    : pathname;
  const hrefRest = hrefProject ? extractProjectRestPath(href) || "/" : href;

  if (hrefRest === "/records") {
    return (
      pathRest === "/records" ||
      (pathRest.startsWith("/records/") && !pathRest.startsWith("/records/new"))
    );
  }
  return pathRest === hrefRest || pathRest.startsWith(`${hrefRest}/`);
}

export function StudioSideNav({ role, onNavigate, className }: Props) {
  const pathname = usePathname() ?? "";
  const projectSlug = useProjectSlug();
  const slugForNav = extractProjectSlug(pathname) ? projectSlug : DEFAULT_PROJECT_SLUG;
  const groups = navForRole(role, slugForNav);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <NavList aria-label="Jord Studio" className="gap-5 p-3">
        {groups.map((group) => (
          <NavListGroup key={group.id} label={group.label}>
            {group.items.map((item) => {
              if (item.status === "soon" || !item.href) {
                return (
                  <NavListItem
                    key={item.id}
                    disabled
                    className="justify-between gap-2"
                  >
                    <span>{item.label}</span>
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                      {item.soonLabel ?? "Soon"}
                    </Badge>
                  </NavListItem>
                );
              }

              const active = isActive(pathname, item.href);
              return (
                <NavListItem key={item.id} asChild active={active}>
                  <Link href={item.href} onClick={onNavigate}>
                    {item.label}
                  </Link>
                </NavListItem>
              );
            })}
          </NavListGroup>
        ))}
      </NavList>
    </ScrollArea>
  );
}
