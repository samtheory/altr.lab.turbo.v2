import path from "node:path";

import {
  getMarkdownBySlug,
  listMarkdownDocuments,
  type MarkdownDocument,
} from "@altr/base/content";

export type HubPageFrontmatter = {
  title?: string;
  description?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaHref?: string;
  order?: number;
  published?: boolean;
};

const CONTENT_DIR = path.join(process.cwd(), "content");

/**
 * Markdown content DB for @altr/hub.
 * Add `.md` files under `apps/hub/content/` — frontmatter + body are the source of truth.
 */
export async function getHubPage(
  slug: string,
): Promise<MarkdownDocument<HubPageFrontmatter>> {
  return getMarkdownBySlug<HubPageFrontmatter>(CONTENT_DIR, slug);
}

export async function listHubPages(): Promise<
  MarkdownDocument<HubPageFrontmatter>[]
> {
  const docs = await listMarkdownDocuments<HubPageFrontmatter>({
    dir: CONTENT_DIR,
    recursive: true,
  });
  return docs
    .filter((d) => d.frontmatter.published !== false)
    .sort((a, b) => (a.frontmatter.order ?? 99) - (b.frontmatter.order ?? 99));
}
