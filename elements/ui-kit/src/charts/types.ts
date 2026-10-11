export type ChartSeriesColor =
  | "chart-1"
  | "chart-2"
  | "chart-3"
  | "chart-4"
  | "chart-5";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: ChartSeriesColor;
  }
>;
