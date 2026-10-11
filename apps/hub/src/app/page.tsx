import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FadeIn,
  ThemeToggle,
} from "@altr/apolyx";

import { getHubPage, listHubPages } from "@/lib/content";

export default async function HubHomePage() {
  const home = await getHubPage("home");
  const pages = (await listHubPages()).filter((p) => p.slug !== "home");
  const fm = home.frontmatter;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--muted)_0%,_transparent_55%)] opacity-80 dark:opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-24 size-[28rem] rounded-full bg-[radial-gradient(circle,_var(--accent)_0%,_transparent_70%)] opacity-60 blur-2xl"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="text-sm font-medium tracking-tight">altr.lab</p>
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 pb-24 pt-10">
        <section className="flex min-h-[70vh] flex-col justify-center gap-8">
          <FadeIn>
            {fm.eyebrow ? (
              <Badge variant="secondary" className="mb-4 w-fit">
                {fm.eyebrow}
              </Badge>
            ) : null}
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
              {fm.title ?? "altr.lab"}
            </h1>
          </FadeIn>

          <FadeIn delay={0.08}>
            <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
              {fm.description}
            </p>
          </FadeIn>

          <FadeIn delay={0.16}>
            <div className="prose prose-neutral dark:prose-invert max-w-xl text-muted-foreground">
              <ReactMarkdown>{home.body}</ReactMarkdown>
            </div>
          </FadeIn>

          <FadeIn delay={0.24} className="flex flex-wrap gap-3">
            {fm.ctaHref && fm.ctaLabel ? (
              <Button asChild size="lg">
                <Link href={fm.ctaHref}>{fm.ctaLabel}</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline" size="lg">
              <Link href="/docs-preview">Markdown content</Link>
            </Button>
          </FadeIn>
        </section>

        <section id="stack" className="grid gap-4 md:grid-cols-2">
          {pages.map((page, index) => (
            <FadeIn key={page.slug} delay={0.05 * index}>
              <Card className="h-full border-border/60 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>{page.frontmatter.title ?? page.slug}</CardTitle>
                  {page.frontmatter.description ? (
                    <CardDescription>
                      {page.frontmatter.description}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="prose prose-sm prose-neutral dark:prose-invert max-w-none text-muted-foreground">
                  <ReactMarkdown>{page.body}</ReactMarkdown>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </section>
      </main>
    </div>
  );
}
