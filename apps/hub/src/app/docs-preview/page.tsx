import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Switch,
  ThemeFamilySwitcher,
  ThemeToggle,
} from "@altr/apolyx";

import { listHubPages } from "@/lib/content";

/**
 * Dev-facing list of every markdown document in `content/`.
 * Also smokes wave-1 Apolyx controls inside Next.
 */
export default async function DocsPreviewPage() {
  const pages = await listHubPages();

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">content/ + Apolyx wave 1</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Markdown content DB
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeFamilySwitcher />
            <Button asChild variant="outline" size="sm">
              <Link href="/">Hub</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Wave 1 smoke</CardTitle>
            <CardDescription>
              Live kit controls under the active theme family.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>default</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="info">info</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smoke-email">Email</Label>
              <Input id="smoke-email" type="email" placeholder="you@altr.lab" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="smoke-check" defaultChecked />
              <Label htmlFor="smoke-check">Notify me</Label>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="smoke-switch">Digest</Label>
              <Switch id="smoke-switch" />
            </div>
            <Alert variant="info">
              <AlertTitle>Apolyx</AlertTitle>
              <AlertDescription>
                Package <code>@altr/apolyx</code> — no Radix.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

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
