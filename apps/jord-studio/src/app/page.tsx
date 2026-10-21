import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@altr/apolyx";

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklch,var(--primary)_18%,transparent),_transparent_55%)]"
      />
      <section className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col justify-center gap-8 px-4 py-20 sm:px-6">
        <p className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
          Jord Studio
        </p>
        <p className="max-w-xl text-lg text-muted-foreground text-pretty">
          Browse and edit Slice 0 <code className="font-mono text-foreground">records</code> through
          jord-server. Local lab only — the browser never opens the database file.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/records">
              Open records <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/records/new">Create record</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
