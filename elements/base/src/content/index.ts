/**
 * Markdown-as-data helpers.
 *
 * Apps (e.g. @altr/hub) store content as `.md` files with YAML frontmatter
 * and load them at build/request time — a file-backed content DB.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

import { NotFoundError } from "../errors";
import { slugify } from "../utils";

export type MarkdownDocument<T extends Record<string, unknown> = Record<string, unknown>> = {
  slug: string;
  filepath: string;
  frontmatter: T;
  body: string;
};

export type ListMarkdownOptions = {
  /** Absolute or cwd-relative directory containing `.md` files */
  dir: string;
  /** Include nested folders (default false) */
  recursive?: boolean;
};

function isMarkdownFile(name: string): boolean {
  return name.endsWith(".md") || name.endsWith(".mdx");
}

/**
 * Parse a single markdown file into frontmatter + body.
 */
export async function parseMarkdownFile<
  T extends Record<string, unknown> = Record<string, unknown>,
>(filepath: string): Promise<MarkdownDocument<T>> {
  const raw = await readFile(filepath, "utf8");
  const { data, content } = matter(raw);
  const base = path.basename(filepath, path.extname(filepath));

  return {
    slug: slugify(String((data as { slug?: string }).slug ?? base)),
    filepath,
    frontmatter: data as T,
    body: content.trim(),
  };
}

/**
 * List and parse all markdown files in a directory.
 */
export async function listMarkdownDocuments<
  T extends Record<string, unknown> = Record<string, unknown>,
>(options: ListMarkdownOptions): Promise<MarkdownDocument<T>[]> {
  const root = path.resolve(options.dir);
  const entries = await readdir(root, { withFileTypes: true });
  const docs: MarkdownDocument<T>[] = [];

  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory() && options.recursive) {
      docs.push(
        ...(await listMarkdownDocuments<T>({
          dir: full,
          recursive: true,
        })),
      );
      continue;
    }
    if (entry.isFile() && isMarkdownFile(entry.name)) {
      docs.push(await parseMarkdownFile<T>(full));
    }
  }

  return docs;
}

/**
 * Find one document by slug under a content directory.
 */
export async function getMarkdownBySlug<
  T extends Record<string, unknown> = Record<string, unknown>,
>(dir: string, slug: string): Promise<MarkdownDocument<T>> {
  const docs = await listMarkdownDocuments<T>({ dir, recursive: true });
  const match = docs.find((d) => d.slug === slug);
  if (!match) {
    throw new NotFoundError(`Markdown document not found: ${slug}`);
  }
  return match;
}
