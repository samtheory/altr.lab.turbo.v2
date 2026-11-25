import type { Metadata } from "next";

import { catalogCount } from "@/catalog/entries";
import { CatalogView } from "@/components/catalog/catalog-view";

export const metadata: Metadata = {
  title: "Catalog · Apolyx",
  description:
    "Browse every Apolyx component, composed block, and page layout with live previews — including motion when the surface is animated.",
};

export default function CatalogPage() {
  const total = catalogCount();
  const components = catalogCount("components");
  const blocks = catalogCount("blocks");
  const pages = catalogCount("pages");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-10 max-w-2xl space-y-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Catalog · {total} surfaces
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          See the kit in motion.
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
          Live previews of every documented component, plus composed blocks and page-scale
          layouts. Filter by section — animated surfaces keep their motion in the card.
        </p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {components} components · {blocks} blocks · {pages} pages
        </p>
      </header>

      <CatalogView />
    </div>
  );
}
