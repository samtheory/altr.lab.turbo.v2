import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { niceTicks } from "../../charts/time-series-chart";
import { SegmentedControl } from "./segmented-control";
import { StatTile } from "./stat-tile";

describe("StatTile", () => {
  it("renders status as text, not colour alone", () => {
    render(<StatTile label="Error rate" value="2%" status="bad" />);
    expect(screen.getByText("Critical")).toBeTruthy();
  });
});

describe("SegmentedControl", () => {
  it("moves selection with arrow keys", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Window"
        value="1h"
        onValueChange={onChange}
        options={[
          { value: "1h", label: "1h" },
          { value: "24h", label: "24h" },
        ]}
      />,
    );
    fireEvent.keyDown(screen.getByRole("radio", { name: "1h" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("24h");
  });
});

describe("niceTicks", () => {
  it("starts at 0 and covers max", () => {
    const t = niceTicks(37);
    expect(t[0]).toBe(0);
    expect(t[t.length - 1]!).toBeGreaterThanOrEqual(37);
  });
});
