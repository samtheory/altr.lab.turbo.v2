import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { DataGrid, type DataGridColumnDef } from "./data-grid";

type Person = {
  id: string;
  name: string;
  role: string;
  score: number;
  active: boolean;
};

const people: Person[] = Array.from({ length: 200 }, (_, i) => ({
  id: String(i + 1),
  name: `Person ${i + 1}`,
  role: i % 3 === 0 ? "admin" : i % 3 === 1 ? "editor" : "viewer",
  score: (i * 17) % 100,
  active: i % 2 === 0,
}));

const columns: DataGridColumnDef<Person>[] = [
  { id: "name", header: "Name", type: "text", width: 160 },
  { id: "role", header: "Role", type: "text", width: 120 },
  { id: "score", header: "Score", type: "number", width: 100 },
  { id: "active", header: "Active", type: "boolean", width: 100 },
];

const meta = {
  title: "Data/DataGrid",
  component: DataGrid,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      rows={people}
      getRowId={(r) => r.id}
      height={360}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      rows={[]}
      getRowId={(r) => r.id}
      loading
      height={280}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      rows={[]}
      getRowId={(r) => r.id}
      emptyMessage="No people match"
      height={220}
    />
  ),
};

export const TenThousand: Story = {
  render: function TenThousandStory() {
    const rows = React.useMemo(
      () =>
        Array.from({ length: 10_000 }, (_, i) => ({
          id: String(i + 1),
          name: `Row ${i + 1}`,
          role: "viewer",
          score: i % 1000,
          active: i % 5 === 0,
        })),
      [],
    );
    return (
      <DataGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        height={480}
        density="compact"
      />
    );
  },
};
