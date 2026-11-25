"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger, cn } from "@altr/apolyx";

import { CopyButton } from "./copy-button";
import { ColoredCode } from "./jsx-snippet";

const runners = {
  pnpm: "pnpm dlx apolyx",
  npm: "npx apolyx",
  yarn: "yarn dlx apolyx",
  bun: "bunx --bun apolyx",
} as const;

function Command({
  value,
  lang,
}: {
  value: string;
  lang: "shell" | "tsx";
}) {
  return (
    <div className="relative">
      <pre
        className={cn(
          "overflow-x-auto rounded-xl border border-border/80 px-4 py-3.5 pr-12",
          "bg-[linear-gradient(165deg,color-mix(in_oklch,var(--muted)_70%,var(--card)),color-mix(in_oklch,var(--card)_90%,var(--muted)))]",
          "shadow-[inset_0_1px_0_color-mix(in_oklch,white_6%,transparent)]",
        )}
      >
        <ColoredCode
          code={value}
          lang={lang}
          className="block text-[12px] leading-[1.7]"
        />
      </pre>
      <CopyButton
        value={value}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-border/50 bg-background/75 backdrop-blur-sm"
      />
    </div>
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
          <Command value={`${runner} add ${name}`} lang="shell" />
        </TabsContent>
      ))}
      <TabsContent value="monorepo">
        <Command value={importLine} lang="tsx" />
      </TabsContent>
    </Tabs>
  );
}
