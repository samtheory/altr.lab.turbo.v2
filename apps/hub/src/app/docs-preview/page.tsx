import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ThemeToggle,
} from "@altr/ui-kit";

import { listHubPages } from "@/lib/content";

/**
 * Dev-facing list of every markdown document in `content/`.
 * Proves the markdown-as-DB path; expand into real routes later.
 */
export default async function DocsPreviewPage() {
  const pages = await listHubPages();

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">content/</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Markdown content DB
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/">Hub</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {pages.map((page) => (
          <Card key={page.slug}>
            <CardHeader>
              <CardTitle>{page.frontmatter.title ?? page.slug}</CardTitle>
              <CardDescription>
                slug: <code>{page.slug}</code>
                {page.frontmatter.description
                  ? ` · ${page.frontmatter.description}`
                  : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
              <ReactMarkdown>{page.body}</ReactMarkdown>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
