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

import { STUDIO_NAV_ICONS } from "@/components/studio-nav-icons";
import { useProjectSlug } from "@/hooks/use-project-path";
import type { JordRole } from "@/lib/auth/roles";
import {
  DEFAULT_PROJECT_SLUG,
  extractProjectRestPath,
  extractProjectSlug,
} from "@/lib/project-scope";
import { navForRole, resolveActiveNavItem } from "@/lib/studio-nav";

type Props = {
  role: JordRole;
  onNavigate?: () => void;
  className?: string;
  /** Icon-only primary rail (desktop collapse). */
  collapsed?: boolean;
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

export function StudioSideNav({
  role,
  onNavigate,
  className,
  collapsed = false,
}: Props) {
  const pathname = usePathname() ?? "";
  const projectSlug = useProjectSlug();
  const slugForNav = extractProjectSlug(pathname)
    ? projectSlug
    : DEFAULT_PROJECT_SLUG;
  const groups = navForRole(role, slugForNav);
  const active = resolveActiveNavItem(pathname, groups);

  return (
    <ScrollArea className={cn("h-full", className)}>
      <NavList
        id="jord-primary-nav"
        aria-label="Jord Studio"
        className={cn("gap-5 p-3", collapsed && "items-center gap-3 p-2")}
      >
        {groups.map((group) => (
          <NavListGroup
            key={group.id}
            label={collapsed ? undefined : group.label}
          >
            {group.items.map((item) => {
              const Icon = STUDIO_NAV_ICONS[item.icon];

              if (item.status === "soon" || !item.href) {
                return (
                  <NavListItem
                    key={item.id}
                    disabled
                    className={cn(
                      "justify-between gap-2",
                      collapsed && "justify-center px-2",
                    )}
                    title={item.label}
                  >
                    <Icon aria-hidden />
                    {!collapsed ? (
                      <>
                        <span className="truncate">{item.label}</span>
                        <Badge
                          variant="outline"
                          className="shrink-0 text-[10px] uppercase"
                        >
                          {item.soonLabel ?? "Soon"}
                        </Badge>
                      </>
                    ) : (
                      <span className="sr-only">{item.label}</span>
                    )}
                  </NavListItem>
                );
              }

              const itemActive =
                active?.id === item.id || isActive(pathname, item.href);
              return (
                <NavListItem
                  key={item.id}
                  asChild
                  active={itemActive}
                  className={cn(collapsed && "justify-center px-2")}
                >
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon aria-hidden />
                    {!collapsed ? (
                      <span className="truncate">{item.label}</span>
                    ) : (
                      <span className="sr-only">{item.label}</span>
                    )}
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
