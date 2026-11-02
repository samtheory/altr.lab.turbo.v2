"use client";

import {
  DataGrid,
  type DataGridColumnDef,
} from "@altr/apolyx";

type Invoice = {
  id: string;
  client: string;
  status: string;
  amount: number;
};

const rows: Invoice[] = [
  { id: "INV-0012", client: "Artemis Labs", status: "paid", amount: 1240 },
  { id: "INV-0013", client: "Helios Co.", status: "pending", amount: 860 },
  { id: "INV-0014", client: "Nyx Studio", status: "overdue", amount: 2310 },
  { id: "INV-0015", client: "Orion Freight", status: "paid", amount: 495 },
  { id: "INV-0016", client: "Vega Soft", status: "pending", amount: 1120 },
];

const columns: DataGridColumnDef<Invoice>[] = [
  { id: "id", header: "Invoice", type: "text", width: 120 },
  { id: "client", header: "Client", type: "text", width: 160 },
  { id: "status", header: "Status", type: "text", width: 110 },
  { id: "amount", header: "Amount", type: "number", width: 100 },
];

export default function DataGridDemo() {
  return (
    <DataGrid
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      height={280}
      className="w-full max-w-3xl"
    />
  );
}
