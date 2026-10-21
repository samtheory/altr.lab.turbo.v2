import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  getPaginationRange,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

describe("Pagination", () => {
  it("marks the active page and fires link clicks", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn((e: MouseEvent) => e.preventDefault());
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => e.preventDefault()} />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={onNext} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    expect(screen.getByRole("link", { name: "2" }).getAttribute("aria-current")).toBe(
      "page",
    );
    await user.click(screen.getByRole("link", { name: "Go to next page" }));
    expect(onNext).toHaveBeenCalled();
  });

  it("builds a compact page range", () => {
    expect(getPaginationRange(1, 3)).toEqual([1, 2, 3]);
    expect(getPaginationRange(5, 10)).toContain("ellipsis");
  });
});
