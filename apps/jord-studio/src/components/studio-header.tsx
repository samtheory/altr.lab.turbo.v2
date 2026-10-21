import Link from "next/link";
import { Button } from "@altr/apolyx";

export function StudioHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Jord Studio
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/records">Records</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/records/new">New record</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
