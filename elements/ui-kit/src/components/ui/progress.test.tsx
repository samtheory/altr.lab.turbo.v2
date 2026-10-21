import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Progress } from "./progress";

describe("Progress", () => {
  it("clamps determinate values", () => {
    render(<Progress value={150} aria-label="Upload" />);
    const bar = screen.getByRole("progressbar", { name: "Upload" });
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(bar.getAttribute("data-state")).toBe("determinate");
  });

  it("supports indeterminate mode", () => {
    render(<Progress aria-label="Loading" />);
    const bar = screen.getByRole("progressbar", { name: "Loading" });
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("data-state")).toBe("indeterminate");
  });
});
