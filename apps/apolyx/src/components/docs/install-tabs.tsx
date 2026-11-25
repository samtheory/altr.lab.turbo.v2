"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@altr/apolyx";

const runners = {
  pnpm: "pnpm dlx apolyx",
  npm: "npx apolyx",
  yarn: "yarn dlx apolyx",
  bun: "bunx --bun apolyx",
} as const;

/** Slate prompt body — readable on light, dark, and power themes. */
const PROMPT_TEXT = "#94A3B8";
/** Magenta chevron marks the line as a shell prompt. */
const PROMPT_CHEVRON = "#E11D8F";

function PromptCommand({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      aria-label={copied ? "Copied to clipboard" : `Copy command: ${value}`}
      title={copied ? "Copied" : "Click to copy"}
      className={cn(
        "group relative flex w-full min-w-0 items-center gap-2.5 overflow-x-auto",
        "rounded-xl border border-border/70 px-4 py-3.5 text-left",
        "bg-[linear-gradient(165deg,color-mix(in_oklch,var(--muted)_55%,var(--card)),color-mix(in_oklch,var(--card)_92%,var(--muted)))]",
        "shadow-[inset_0_1px_0_color-mix(in_oklch,white_6%,transparent)]",
        "transition-[border-color,background-color,box-shadow] duration-200",
        "hover:border-[color-mix(in_srgb,#E11D8F_35%,var(--border))]",
        "hover:bg-[linear-gradient(165deg,color-mix(in_oklch,var(--muted)_70%,var(--card)),color-mix(in_oklch,var(--card)_88%,var(--muted)))]",
        "hover:shadow-[inset_0_1px_0_color-mix(in_oklch,white_8%,transparent),0_0_0_1px_color-mix(in_srgb,#E11D8F_12%,transparent)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.997]",
        copied &&
          "border-success/40 bg-success/5 shadow-[inset_0_1px_0_color-mix(in_oklch,white_6%,transparent)]",
      )}
    >
      <span
        aria-hidden
        className="shrink-0 select-none font-mono text-[22px] font-semibold leading-none transition-transform duration-200 group-hover:translate-x-px"
        style={{ color: PROMPT_CHEVRON }}
      >
        ›
      </span>
      <code
        className="min-w-0 flex-1 whitespace-pre font-mono text-[12.5px] leading-[1.7] tracking-tight"
        style={{ color: PROMPT_TEXT }}
      >
        {value}
      </code>
      <span
        className={cn(
          "pointer-events-none shrink-0 font-mono text-[10px] uppercase tracking-[0.12em]",
          "opacity-0 transition-opacity duration-200",
          "group-hover:opacity-100",
          copied ? "text-success opacity-100" : "opacity-70",
        )}
        style={copied ? undefined : { color: PROMPT_TEXT }}
      >
        {copied ? (
          <span className="inline-flex items-center gap-1">
            <Check className="size-3" aria-hidden />
            copied
          </span>
        ) : (
          "copy"
        )}
      </span>
    </button>
  );
}

export function InstallTabs({
  name,
  exports,
  from = "@altr/apolyx",
}: {
  /** Registry item name(s), space separated. */
  name: string;
  /** Named exports shown in the monorepo tab. */
  exports?: string;
  from?: string;
}) {
  const importLine = `import { ${exports ?? "…"} } from "${from}";`;

  return (
    <Tabs defaultValue="pnpm" className="not-prose my-6">
      <TabsList aria-label="Install method">
        {Object.keys(runners).map((pm) => (
          <TabsTrigger key={pm} value={pm}>
            {pm}
          </TabsTrigger>
        ))}
        <TabsTrigger value="monorepo">Monorepo</TabsTrigger>
      </TabsList>
      {Object.entries(runners).map(([pm, runner]) => (
        <TabsContent key={pm} value={pm}>
          <PromptCommand value={`${runner} add ${name}`} />
        </TabsContent>
      ))}
      <TabsContent value="monorepo">
        <PromptCommand value={importLine} />
      </TabsContent>
    </Tabs>
  );
}
