import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DocStatusBadge } from "@/components/site/doc-status-badge";
import { TableOfContents } from "@/components/site/toc";
import { allDocs, docFile, docHref, findDoc, neighbours } from "@/docs-config";
import { extractHeadings } from "@/lib/slugify";

type Props = { params: Promise<{ slug?: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allDocs.map((doc) => ({ slug: doc.slug ? doc.slug.split("/") : [] }));
}

async function resolve(params: Props["params"]) {
  const { slug = [] } = await params;
  return findDoc(slug.join("/"));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await resolve(params);
  if (!doc) return {};
  return { title: `${doc.title} · Apolyx`, description: doc.description };
}

export default async function DocPage({ params }: Props) {
  const doc = await resolve(params);
  if (!doc) notFound();

  const file = docFile(doc.slug);
  const { default: Content } = (await import(`../../../content/docs/${file}.mdx`)) as {
    default: React.ComponentType;
  };
  const source = await readFile(
    path.join(process.cwd(), "src", "content", "docs", `${file}.mdx`),
    "utf8",
  );
  const headings = extractHeadings(source);
  const { prev, next } = neighbours(doc.slug);

  return (
    <div className="flex gap-10">
      <article className="min-w-0 max-w-3xl flex-1 py-10">
        <header className="mb-8 space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance">
              {doc.title}
            </h1>
            <DocStatusBadge status={doc.status} className="text-xs normal-case tracking-normal" />
          </div>
          <p className="text-lg text-muted-foreground text-pretty">{doc.description}</p>
        </header>
        <Content />
        <nav aria-label="Pagination" className="mt-16 flex justify-between gap-4 border-t border-border pt-6 text-sm">
          {prev ? (
            <Link href={docHref(prev.slug)} className="group flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" aria-hidden />
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={docHref(next.slug)} className="group flex items-center gap-1 text-muted-foreground hover:text-foreground">
              {next.title}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </nav>
      </article>
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-52 shrink-0 self-start xl:block">
        <div className="apolyx-rail h-full overflow-y-auto overscroll-contain py-10 [overflow-anchor:none]">
          <TableOfContents headings={headings} />
        </div>
      </aside>
    </div>
  );
}
