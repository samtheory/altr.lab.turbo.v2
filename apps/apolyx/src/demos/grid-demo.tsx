import { Card, CardDescription, CardHeader, CardTitle, Grid } from "@altr/apolyx";

const stats = [
  { label: "Revenue", value: "$48.2k" },
  { label: "Active users", value: "2,914" },
  { label: "p95 latency", value: "182 ms" },
  { label: "Error rate", value: "0.08%" },
];

export default function GridDemo() {
  return (
    <Grid cols={{ base: 1, sm: 2, lg: 4 }} className="w-full">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardHeader>
            <CardDescription>{s.label}</CardDescription>
            <CardTitle className="tabular-nums">{s.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </Grid>
  );
}
