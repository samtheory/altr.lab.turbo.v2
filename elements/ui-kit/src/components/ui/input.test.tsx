import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Input } from "./input";
import { Textarea } from "./textarea";

describe("Input", () => {
  it("applies size, variant and shape", () => {
    render(<Input aria-label="Search" size="lg" variant="filled" shape="pill" htmlSize={12} />);
    const input = screen.getByRole("textbox", { name: "Search" });
    expect(input.getAttribute("data-size")).toBe("lg");
    expect(input.getAttribute("data-variant")).toBe("filled");
    expect(input.className).toContain("h-11");
    expect(input.className).toContain("bg-muted");
    expect(input.className).toContain("rounded-full");
    expect(input.getAttribute("size")).toBe("12");
  });

  it("defaults to the outline md look", () => {
    render(<Input aria-label="Name" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toContain("h-10");
    expect(input.className).toContain("border-input");
  });

  it("gives underline a centre-out focus bar", () => {
    render(<Input aria-label="Name" variant="underline" />);
    expect(screen.getByRole("textbox").className).toContain("focus-visible:bg-[length:100%_2px]");
  });
});

describe("Textarea", () => {
  it("shares variants and sizes", () => {
    render(<Textarea aria-label="Notes" variant="ghost" size="sm" />);
    const ta = screen.getByRole("textbox");
    expect(ta.getAttribute("data-variant")).toBe("ghost");
    expect(ta.className).toContain("min-h-16");
  });
});
