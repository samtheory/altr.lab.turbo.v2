import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Slot } from "./slot";

describe("Slot", () => {
  it("merges className onto the child", () => {
    render(
      <Slot className="from-slot">
        <button type="button" className="from-child">
          Go
        </button>
      </Slot>,
    );
    expect(screen.getByRole("button").className).toContain("from-slot");
    expect(screen.getByRole("button").className).toContain("from-child");
  });

  it("runs child handler before slot and skips slot if prevented", async () => {
    const user = userEvent.setup();
    const child = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    const slot = vi.fn();
    render(
      <Slot onClick={slot}>
        <button type="button" onClick={child}>
          Go
        </button>
      </Slot>,
    );
    await user.click(screen.getByRole("button"));
    expect(child).toHaveBeenCalled();
    expect(slot).not.toHaveBeenCalled();
  });

  it("composes refs", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Slot ref={ref}>
        <button type="button">Go</button>
      </Slot>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
