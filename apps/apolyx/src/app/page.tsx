import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button } from "@altr/apolyx";

import { CopyButton } from "@/components/docs/copy-button";
import { LandingShowcase } from "@/components/site/landing-showcase";
import { allDocs } from "@/docs-config";

const pillars = [
  {
    title: "Own the code",
    body: "The CLI copies source into your project. Change anything; there is no black-box package to fight.",
  },
  {
    title: "Three families, two modes",
    body: "default, power-blue, and power-green — each with light and dark, all OKLCH tokens with AA contrast.",
  },
  {
    title: "Primitives, not dependencies",
    body: "Focus, layering, portals, and roving focus are Apolyx primitives. No Radix, no Base UI.",
  },
  {
    title: "Motion and charts included",
    body: "Motion recipes that respect reduced motion, and SVG charts on visx scales that read your tokens.",
  },
];

export default function HomePage() {
  const componentCount = allDocs.filter((d) => d.slug.startsWith("components/")).length;
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-24">
        <div className="space-y-6">
          <Badge variant="outline">Sprint Apolyx-S0001 · {componentCount} components</Badge>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
            The altr.lab UI kit you own.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-pretty">
            Tokens, primitives, components, motion, and charts. Import from the workspace inside the
            monorepo, or copy the source into any React app with the <code className="font-mono text-foreground">apolyx</code> CLI.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/docs">
                Get started <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs/components/button">Browse components</Link>
            </Button>
          </div>
          <div className="flex max-w-md items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 py-1.5 pl-4 pr-1.5 font-mono text-sm">
            <span>
              <span className="text-muted-foreground">$</span> npx apolyx add button
            </span>
            <CopyButton value="npx apolyx add button" />
          </div>
        </div>
        <LandingShowcase />
      </section>

      <section aria-labelledby="pillars" className="border-t border-border py-16">
        <h2 id="pillars" className="sr-only">
          Why Apolyx
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="space-y-2">
              <h3 className="font-display font-semibold">{pillar.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
