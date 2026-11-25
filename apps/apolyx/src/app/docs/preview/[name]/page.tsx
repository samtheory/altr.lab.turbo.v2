import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { demos, type DemoName } from "@/demos";

type Props = {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ embed?: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return (Object.keys(demos) as DemoName[]).map((name) => ({ name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  return { title: `${name} · Preview · Apolyx` };
}

export default async function DemoPreviewPage({ params, searchParams }: Props) {
  const { name } = await params;
  const { embed } = await searchParams;
  if (!(name in demos)) notFound();
  const Demo = demos[name as DemoName];
  const isEmbed = embed === "1" || embed === "true";

  if (isEmbed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
        <div className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-4">
          <Demo />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-muted-foreground">{name}</p>
          <p className="font-display text-sm font-medium">Isolated preview</p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            href="/catalog"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Catalog
          </Link>
          <Link
            href="/docs/components"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Docs
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="flex w-full max-w-4xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 p-8 sm:p-12">
          <Demo />
        </div>
      </main>
    </div>
  );
}
