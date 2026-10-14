"use client";

import {
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

const flags = [
  { key: "new-editor", owner: "Docs", rollout: "25%", on: true },
  { key: "fast-search", owner: "Platform", rollout: "100%", on: true },
  { key: "ai-summaries", owner: "Research", rollout: "5%", on: false },
  { key: "legacy-export", owner: "Billing", rollout: "0%", on: false },
];

export default function SwitchTableDemo() {
  return (
    <Table className="w-full max-w-lg">
      <TableHeader>
        <TableRow>
          <TableHead>Flag</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Rollout</TableHead>
          <TableHead className="text-right">Enabled</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flags.map((f) => (
          <TableRow key={f.key}>
            <TableCell className="font-mono text-xs">{f.key}</TableCell>
            <TableCell>{f.owner}</TableCell>
            <TableCell className="tabular-nums">{f.rollout}</TableCell>
            <TableCell className="text-right">
              <Switch size="sm" aria-label={`Enable ${f.key}`} defaultChecked={f.on} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
