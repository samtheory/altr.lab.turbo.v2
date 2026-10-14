import {
  Badge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@altr/apolyx";

const invoices = [
  { id: "INV-0012", client: "Artemis Labs", status: "paid", amount: 1240 },
  { id: "INV-0013", client: "Helios Co.", status: "pending", amount: 860 },
  { id: "INV-0014", client: "Nyx Studio", status: "overdue", amount: 2310 },
  { id: "INV-0015", client: "Orion Freight", status: "paid", amount: 495 },
] as const;

const statusVariant = {
  paid: "success",
  pending: "warning",
  overdue: "destructive",
} as const;

export default function TableDemo() {
  return (
    <Table striped containerClassName="w-full max-w-2xl">
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv, i) => (
          <TableRow key={inv.id} selected={i === 1}>
            <TableCell className="font-mono text-xs">{inv.id}</TableCell>
            <TableCell>{inv.client}</TableCell>
            <TableCell>
              <Badge variant={statusVariant[inv.status]}>{inv.status}</Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">${inv.amount.toLocaleString("en-US")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>Total</TableCell>
          <TableCell className="text-right tabular-nums">$4,905</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
