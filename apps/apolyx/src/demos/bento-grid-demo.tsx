"use client";

import { BentoGrid, BentoItem } from "@altr/apolyx";

function Tile({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-full min-h-[6.5rem] flex-col justify-between gap-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold tracking-tight text-foreground">{subtitle ?? "—"}</p>
    </div>
  );
}

export default function Demo() {
  return (
    <BentoGrid className="w-full max-w-3xl">
      <BentoItem colSpan={2} rowSpan={2} className="bg-[linear-gradient(145deg,color-mix(in_oklch,var(--primary)_12%,var(--card)),var(--card))]">
        <Tile title="Featured" subtitle="Agent workspace" />
        <p className="text-sm text-pretty text-muted-foreground">
          Span two columns and two rows for hero tiles in a bento layout.
        </p>
      </BentoItem>
      <BentoItem>
        <Tile title="Runs" subtitle="1.2k" />
      </BentoItem>
      <BentoItem>
        <Tile title="Latency" subtitle="42ms" />
      </BentoItem>
      <BentoItem colSpan={2}>
        <Tile title="Integrations" subtitle="MCP · Jord · Apolyx" />
      </BentoItem>
      <BentoItem>
        <Tile title="Uptime" subtitle="99.9%" />
      </BentoItem>
    </BentoGrid>
  );
}