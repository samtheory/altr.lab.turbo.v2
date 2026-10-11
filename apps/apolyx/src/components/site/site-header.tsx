import Link from "next/link";
import { Search } from "lucide-react";
import { Kbd, ThemeFamilySwitcher, ThemeToggle } from "@altr/apolyx";

import { MobileNav } from "./mobile-nav";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
        <MobileNav />
        <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <span aria-hidden className="grid size-6 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            A
          </span>
          Apolyx
        </Link>
        <nav aria-label="Primary" className="ml-4 hidden items-center gap-4 text-sm md:flex">
          <Link href="/docs" className="text-muted-foreground transition-colors hover:text-foreground">
            Docs
          </Link>
          <Link href="/docs/components/button" className="text-muted-foreground transition-colors hover:text-foreground">
            Components
          </Link>
          <Link href="/docs/theming" className="text-muted-foreground transition-colors hover:text-foreground">
            Theming
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Search is coming in a later sprint"
            className="hidden h-9 w-56 items-center gap-2 rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground disabled:cursor-not-allowed sm:flex"
          >
            <Search className="size-4" aria-hidden />
            Search docs…
            <Kbd className="ml-auto">⌘K</Kbd>
          </button>
          <ThemeFamilySwitcher className="hidden md:inline-flex" />
          <ThemeToggle />
          <a
            href="https://github.com/samtheory/altr.lab.turbo.v2"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <GitHubIcon />
          </a>
        </div>
      </div>
    </header>
  );
}
