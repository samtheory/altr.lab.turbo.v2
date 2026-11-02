import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  applyDataGridFilters,
  emptyColumnLayout,
  mergeColumnLayout,
  processDataGridRows,
} from "./data-grid";
import { DataGrid } from "./data-grid";
import type { DataGridColumnDef, DataGridFilter } from "./data-grid-types";

type Row = { id: string; name: string; age: number; active: boolean };

const columns: DataGridColumnDef<Row>[] = [
  { id: "name", header: "Name", type: "text" },
  { id: "age", header: "Age", type: "number" },
  { id: "active", header: "Active", type: "boolean" },
];

const rows: Row[] = [
  { id: "1", name: "Ada", age: 36, active: true },
  { id: "2", name: "Grace", age: 45, active: false },
  { id: "3", name: "Alan", age: 41, active: true },
];

describe("data-grid filters/sort helpers", () => {
  it("filters with AND and typed operators", () => {
    const filters: DataGridFilter[] = [
      {
        id: "a",
        columnId: "name",
        operator: "contains",
        value: "a",
      },
      {
        id: "b",
        columnId: "active",
        operator: "is_true",
      },
    ];
    const next = applyDataGridFilters(rows, columns, filters);
    expect(next.map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("sorts numbers ascending", () => {
    const next = processDataGridRows(rows, columns, {
      sort: { columnId: "age", direction: "asc" },
    });
    expect(next.map((r) => r.age)).toEqual([36, 41, 45]);
  });

  it("merges new columns into a saved layout without dropping order", () => {
    const layout = emptyColumnLayout(["name", "age"]);
    layout.hidden = ["age"];
    layout.widths = { name: 200 };
    const merged = mergeColumnLayout(layout, ["name", "age", "active"]);
    expect(merged.order).toEqual(["name", "age", "active"]);
    expect(merged.hidden).toEqual(["age"]);
    expect(merged.widths.name).toBe(200);
  });
});

describe("DataGrid", () => {
  it("renders virtualized rows and sorts from the header", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        height={240}
        onSortChange={onSortChange}
        showFilterBuilder={false}
      />,
    );

    expect(screen.getByRole("grid")).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("Grace")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Age" }));
    expect(onSortChange).toHaveBeenCalledWith({
      columnId: "age",
      direction: "asc",
    });
  });

  it("hides a column from the Columns menu", async () => {
    const user = userEvent.setup();
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        height={240}
        showFilterBuilder={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Columns" }));
    const menu = screen.getByRole("menu");
    const ageItem = within(menu).getByRole("menuitemcheckbox", { name: "Age" });
    await user.click(ageItem);
    expect(screen.queryByRole("columnheader", { name: /Age/i })).toBeNull();
  });

  it("applies quick search from the filter builder", async () => {
    const user = userEvent.setup();
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        height={240}
      />,
    );

    const search = screen.getByRole("searchbox", { name: "Quick search" });
    await user.type(search, "Grace");
    expect(screen.getByText("Grace")).toBeTruthy();
    expect(screen.queryByText("Ada")).toBeNull();
  });

  it("supports multi-select and select-all on the loaded page", async () => {
    const user = userEvent.setup();
    const onSelectedRowIdsChange = vi.fn();
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        height={240}
        selectionMode="multi"
        selectedRowIds={[]}
        onSelectedRowIdsChange={onSelectedRowIdsChange}
        showFilterBuilder={false}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Select row 1" }));
    expect(onSelectedRowIdsChange).toHaveBeenCalledWith(["1"]);

    await user.click(
      screen.getByRole("checkbox", { name: "Select all rows on this page" }),
    );
    expect(onSelectedRowIdsChange).toHaveBeenCalledWith(["1", "2", "3"]);
  });

  it("virtualizes a 10k-row body so only a window is mounted", () => {
    const many = Array.from({ length: 10_000 }, (_, i) => ({
      id: String(i + 1),
      name: `N${i + 1}`,
      age: i,
      active: true,
    }));
    render(
      <DataGrid
        columns={columns}
        rows={many}
        getRowId={(r) => r.id}
        height={240}
        showFilterBuilder={false}
      />,
    );
    const mounted = document.querySelectorAll("[data-row-id]").length;
    expect(mounted).toBeGreaterThan(0);
    expect(mounted).toBeLessThan(200);
    expect(screen.getByRole("grid").getAttribute("aria-rowcount")).toBe(
      "10000",
    );
  });
});
