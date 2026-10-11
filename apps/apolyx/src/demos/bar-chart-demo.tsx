"use client";

import { BarChart, ChartContainer, type ChartConfig } from "@altr/apolyx";

const data = [
  { quarter: "Q1", web: 120, api: 80, mobile: 40 },
  { quarter: "Q2", web: 150, api: 95, mobile: 60 },
  { quarter: "Q3", web: 170, api: 110, mobile: 75 },
  { quarter: "Q4", web: 210, api: 130, mobile: 90 },
];

const config: ChartConfig = {
  web: { label: "Web", color: "chart-1" },
  api: { label: "API", color: "chart-2" },
  mobile: { label: "Mobile", color: "chart-3" },
};

export default function BarChartDemo() {
  return (
    <ChartContainer config={config} className="w-full" aria-label="Requests by surface per quarter">
      <BarChart data={data} x="quarter" series={["web", "api", "mobile"]} stacked />
    </ChartContainer>
  );
}
