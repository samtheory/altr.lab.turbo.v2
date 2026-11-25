"use client";

import * as React from "react";

import { cn } from "../lib/utils";

export type LeadStatus = "new" | "qualified" | "nurture" | "won" | "lost";

export type LeadRow = {
  name: string;
  email: string;
  status: LeadStatus;
  score?: number;
};

export type LeadsTableProps = {
  leads?: LeadRow[];
  className?: string;
};

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-info/15 text-info",
  qualified: "bg-primary/15 text-primary",
  nurture: "bg-warning/15 text-warning",
  won: "bg-success/15 text-success",
  lost: "bg-muted text-muted-foreground",
};

const defaultLeads: LeadRow[] = [
  { name: "Avery Chen", email: "avery@acme.io", status: "qualified", score: 92 },
  { name: "Blake Ortiz", email: "blake@north.dev", status: "new", score: 71 },
  { name: "Casey Morgan", email: "casey@studio.app", status: "nurture", score: 58 },
  { name: "Drew Ellis", email: "drew@launch.co", status: "won", score: 88 },
];

function formatStatus(status: LeadStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Presentational leads table for marketing previews. */
export function LeadsTable({ leads = defaultLeads, className }: LeadsTableProps) {
  return (
    <div
      data-slot="leads-table"
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border/80 px-5 py-4">
        <h3 className="text-sm font-semibold">Recent leads</h3>
        <p className="text-xs text-muted-foreground">Demo data — not a DataGrid.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.email}
                className="border-b border-border/40 last:border-0 transition-colors hover:bg-muted/40"
              >
                <td className="px-5 py-3.5 font-medium">{lead.name}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{lead.email}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      statusStyles[lead.status],
                    )}
                  >
                    {formatStatus(lead.status)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums">
                  {lead.score ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}