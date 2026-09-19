import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ThemeToggle,
} from "@altr/ui-kit";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-16 text-foreground">
      <div className="flex w-full max-w-lg items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">@altr/web</p>
          <h1 className="text-3xl font-semibold tracking-tight">altr.lab</h1>
        </div>
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>UI kit wired</CardTitle>
          <CardDescription>
            Shared Tailwind tokens and shadcn-style components from{" "}
            <code className="text-foreground">@altr/ui-kit</code>. Toggle
            light/dark with the button above.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </CardContent>
      </Card>
    </main>
  );
}
