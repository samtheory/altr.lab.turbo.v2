"use client";

import { ChartContainer, LineChart, type ChartConfig } from "@altr/apolyx";

const data = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 273, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 314, mobile: 240 },
];

const config: ChartConfig = {
  desktop: { label: "Desktop", color: "chart-1" },
  mobile: { label: "Mobile", color: "chart-2" },
};

export default function LineChartDemo() {
  return (
    <ChartContainer config={config} className="w-full" aria-label="Visitors by device, January to June">
      <LineChart data={data} x="month" series={["desktop", "mobile"]} curve="monotone" />
    </ChartContainer>
  );
}
