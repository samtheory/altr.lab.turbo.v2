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

import { STUDIO_NAV } from "@/lib/studio-nav";

type Props = {
  onNavigate?: () => void;
  className?: string;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/records") {
    return pathname === "/records" || (pathname.startsWith("/records/") && !pathname.startsWith("/records/new"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSideNav({ onNavigate, className }: Props) {
  const pathname = usePathname();

  return (
    <ScrollArea className={cn("h-full", className)}>
      <NavList aria-label="Jord Studio" className="gap-5 p-3">
        {STUDIO_NAV.map((group) => (
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
