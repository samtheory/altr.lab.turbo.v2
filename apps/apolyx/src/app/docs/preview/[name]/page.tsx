import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demos, type DemoName } from "@/demos";

type Props = { params: Promise<{ name: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return (Object.keys(demos) as DemoName[]).map((name) => ({ name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  return { title: `${name} · Preview · Apolyx` };
}

export default async function DemoPreviewPage({ params }: Props) {
  const { name } = await params;
  if (!(name in demos)) notFound();
  const Demo = demos[name as DemoName];

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-muted-foreground">{name}</p>
          <p className="font-display text-sm font-medium">Isolated preview</p>
        </div>
        <Link
          href="/docs/components"
          className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Back to docs
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="flex w-full max-w-4xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-8 sm:p-12">
          <Demo />
        </div>
      </main>
    </div>
  );
}
