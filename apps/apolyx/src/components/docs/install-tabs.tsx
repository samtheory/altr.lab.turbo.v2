"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@altr/apolyx";

import { CopyButton } from "./copy-button";

const runners = {
  pnpm: "pnpm dlx apolyx",
  npm: "npx apolyx",
  yarn: "yarn dlx apolyx",
  bun: "bunx --bun apolyx",
} as const;

function Command({ value }: { value: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl border border-border bg-muted/50 px-4 py-3 pr-12 font-mono text-sm">
        <code>{value}</code>
      </pre>
      <CopyButton value={value} className="absolute right-2 top-1/2 -translate-y-1/2" />
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
          <Command value={`${runner} add ${name}`} />
        </TabsContent>
      ))}
      <TabsContent value="monorepo">
        <Command value={`import { ${exports ?? "…"} } from "${from}";`} />
      </TabsContent>
    </Tabs>
  );
}
