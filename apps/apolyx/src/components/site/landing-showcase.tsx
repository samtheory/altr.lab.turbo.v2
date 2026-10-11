"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartContainer,
  FadeIn,
  Label,
  LineChart,
  Switch,
  toast,
  type ChartConfig,
} from "@altr/apolyx";

const data = [
  { week: "W1", signups: 32, active: 20 },
  { week: "W2", signups: 41, active: 26 },
  { week: "W3", signups: 38, active: 31 },
  { week: "W4", signups: 56, active: 39 },
  { week: "W5", signups: 61, active: 47 },
  { week: "W6", signups: 72, active: 55 },
];

const config: ChartConfig = {
  signups: { label: "Signups", color: "chart-1" },
  active: { label: "Active", color: "chart-2" },
};

export function LandingShowcase() {
  return (
    <FadeIn>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle as="h2">Weekly growth</CardTitle>
            <Badge variant="success">+18%</Badge>
          </div>
          <CardDescription>Switch the theme family in the header — every token follows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ChartContainer config={config} aspectRatio={2} aria-label="Signups and active users by week">
            <LineChart data={data} x="week" series={["signups", "active"]} curve="monotone" area />
          </ChartContainer>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="landing-digest">Weekly digest</Label>
            <Switch id="landing-digest" defaultChecked />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="ghost">Dismiss</Button>
          <Button onClick={() => toast.success("Report exported", { description: "growth-w6.csv" })}>
            Export
          </Button>
        </CardFooter>
      </Card>
    </FadeIn>
  );
}
