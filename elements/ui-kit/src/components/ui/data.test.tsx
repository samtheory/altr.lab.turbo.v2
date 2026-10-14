import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";

import { Grid } from "./grid";
import { List, ListItem, ListItemContent, ListItemTitle } from "./list";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

describe("Table", () => {
  it("renders native table semantics with column headers and selected rows", () => {
    render(
      <Table>
        <TableCaption>Invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Id</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow selected>
            <TableCell>INV-1</TableCell>
            <TableCell>$20</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const table = screen.getByRole("table", { name: "Invoices" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers.map((h) => h.getAttribute("scope"))).toEqual(["col", "col"]);
    const row = within(table).getAllByRole("row")[1]!;
    expect(row.getAttribute("aria-selected")).toBe("true");
  });
});

describe("List", () => {
  it("renders list items and supports interactive rows via asChild", () => {
    render(
      <List variant="divided">
        <ListItem>
          <ListItemContent>
            <ListItemTitle>Static</ListItemTitle>
          </ListItemContent>
        </ListItem>
        <ListItem asChild>
          <a href="#ada">Ada</a>
        </ListItem>
      </List>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    const link = screen.getByRole("link", { name: "Ada" });
    expect(link.className).toContain("hover:bg-accent-hover");
  });
});

describe("Grid", () => {
  it("maps responsive cols to classes and supports auto-fill", () => {
    const { container, rerender } = render(<Grid cols={{ base: 1, md: 3 }} />);
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("md:grid-cols-3");
    rerender(<Grid minItemWidth="12rem" />);
    expect((container.firstElementChild as HTMLElement).style.gridTemplateColumns).toContain(
      "auto-fill",
    );
  });
});
