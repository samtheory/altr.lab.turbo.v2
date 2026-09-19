import { Card, CardDescription, CardHeader, CardTitle, ThemeToggle } from "@altr/ui-kit";

export default function DashboardHomePage() {
  return (
    <main className="flex min-h-screen flex-col gap-6 bg-background px-6 py-12 text-foreground">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>@altr/dashboard</CardTitle>
          <CardDescription>
            Thin scaffold — extend with admin routes. Uses @altr/ui-kit theme.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
