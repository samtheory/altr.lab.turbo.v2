import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ScrollArea } from "./scroll-area";

describe("ScrollArea", () => {
  it("renders a scrollport", () => {
    render(
      <ScrollArea aria-label="Log" className="h-24">
        <p>line</p>
      </ScrollArea>,
    );
    expect(screen.getByLabelText("Log").getAttribute("data-slot")).toBe("scroll-area");
  });
});
