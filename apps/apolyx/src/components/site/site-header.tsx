"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import {
  Button,
  Kbd,
  Separator,
  ThemeFamilySwitcher,
  ThemeToggle,
  cn,
} from "@altr/apolyx";

import { MobileNav } from "./mobile-nav";

const NAV = [
  { href: "/docs", label: "Docs", match: (path: string) => path === "/docs" || path === "/docs/" },
  {
    href: "/docs/components/button",
    label: "Components",
    match: (path: string) => path.startsWith("/docs/components"),
  },
  {
    href: "/docs/theming",
    label: "Theming",
    match: (path: string) => path.startsWith("/docs/theming"),
  },
] as const;

const TOOL = "size-9 shrink-0";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/70 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <MobileNav />
          <Link
            href="/"
            className="group flex items-baseline gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-display text-[1.35rem] leading-none tracking-tight text-foreground transition-opacity group-hover:opacity-80">
              <span className="text-[var(--apolyx-mark)]">A</span>polyx
            </span>
            <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
              UI kit
            </span>
          </Link>
        </div>

        <nav aria-label="Primary" className="hidden items-center self-stretch md:flex">
          <ul className="flex h-full items-stretch gap-0.5">
            {NAV.map((item) => {
              const active = item.match(pathname);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center px-3 text-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-foreground transition-transform duration-200 ease-out",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex h-9 items-center gap-2">
          <button
            type="button"
            disabled
            title="Search is coming in a later sprint"
            className={cn(
              "hidden h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground",
              "disabled:cursor-not-allowed lg:inline-flex",
            )}
          >
            <Search className="size-3.5 shrink-0 opacity-70" aria-hidden />
            <span className="pr-4">Search</span>
            <Kbd className="ml-auto border-border/70 bg-muted/50">⌘K</Kbd>
          </button>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />

          <ThemeFamilySwitcher className="hidden h-9 lg:inline-flex" />
          <ThemeToggle className={TOOL} />
          <Button
            variant="outline"
            size="icon"
            asChild
            className={cn(TOOL, "bg-foreground text-background hover:bg-foreground/90 hover:text-background")}
          >
            <a
              href="https://github.com/samtheory/altr.lab.turbo.v2"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub repository"
            >
              <GitHubIcon />
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
