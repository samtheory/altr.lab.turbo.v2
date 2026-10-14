import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronRight, FileText, Folder } from "lucide-react";

import { Avatar, AvatarFallback } from "./avatar";
import { Badge } from "./badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Grid } from "./grid";
import {
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemLeading,
  ListItemTitle,
  ListItemTrailing,
} from "./list";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

const meta = {
  title: "UI/Data",
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

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

export const DataTable: Story = {
  render: () => (
    <div className="w-[40rem]">
      <Table striped>
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
              <TableCell className="text-right tabular-nums">
                ${inv.amount.toLocaleString()}
              </TableCell>
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
    </div>
  ),
};

export const CompactStickyTable: Story = {
  render: () => (
    <div className="w-[32rem]">
      <Table density="compact" stickyHeader containerClassName="max-h-56">
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Event</TableHead>
            <TableHead className="text-right">Latency</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 20 }, (_, i) => (
            <TableRow key={i}>
              <TableCell className="tabular-nums">{i + 1}</TableCell>
              <TableCell>deploy.step.{i % 4}</TableCell>
              <TableCell className="text-right tabular-nums">{40 + ((i * 37) % 160)} ms</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

const people = [
  { name: "Ada Lovelace", role: "Engineering", initials: "AL" },
  { name: "Grace Hopper", role: "Platform", initials: "GH" },
  { name: "Alan Turing", role: "Research", initials: "AT" },
];

export const Lists: Story = {
  render: () => (
    <div className="grid w-[48rem] grid-cols-3 gap-6">
      <List variant="divided">
        {people.map((p) => (
          <ListItem key={p.name} asChild>
            <a href="#">
              <ListItemLeading>
                <Avatar className="size-8">
                  <AvatarFallback>{p.initials}</AvatarFallback>
                </Avatar>
              </ListItemLeading>
              <ListItemContent>
                <ListItemTitle>{p.name}</ListItemTitle>
                <ListItemDescription>{p.role}</ListItemDescription>
              </ListItemContent>
              <ListItemTrailing>
                <ChevronRight className="size-4" />
              </ListItemTrailing>
            </a>
          </ListItem>
        ))}
      </List>
      <List variant="card">
        {["Q3 report.pdf", "Brand kit", "Roadmap.md"].map((name, i) => (
          <ListItem key={name}>
            <ListItemLeading>{i === 1 ? <Folder /> : <FileText />}</ListItemLeading>
            <ListItemContent>
              <ListItemTitle>{name}</ListItemTitle>
              <ListItemDescription>Updated 2 days ago</ListItemDescription>
            </ListItemContent>
          </ListItem>
        ))}
      </List>
      <List>
        {["Inbox", "Drafts", "Archive"].map((name, i) => (
          <ListItem key={name} asChild>
            <button type="button">
              <ListItemContent>
                <ListItemTitle>{name}</ListItemTitle>
              </ListItemContent>
              <ListItemTrailing>
                <Badge variant="secondary">{(i + 1) * 4}</Badge>
              </ListItemTrailing>
            </button>
          </ListItem>
        ))}
      </List>
    </div>
  ),
};

export const CardGrid: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="grid gap-10">
      <Grid cols={{ base: 1, sm: 2, lg: 4 }} gap="md">
        {["Revenue", "Users", "Latency", "Errors"].map((t) => (
          <Card key={t}>
            <CardHeader>
              <CardDescription>{t}</CardDescription>
              <CardTitle>—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </Grid>
      <Grid minItemWidth="12rem" gap="sm">
        {Array.from({ length: 7 }, (_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Auto-fill tile {i + 1}
            </CardContent>
          </Card>
        ))}
      </Grid>
    </div>
  ),
};
