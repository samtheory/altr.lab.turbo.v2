import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { Presence } from "./presence";

describe("Presence", () => {
  it("unmounts after exit delay", async () => {
    const onExitComplete = vi.fn();
    const { rerender } = render(
      <Presence present onExitComplete={onExitComplete}>
        <div>content</div>
      </Presence>,
    );
    expect(screen.getByText("content")).toBeTruthy();
    rerender(
      <Presence present={false} onExitComplete={onExitComplete}>
        <div>content</div>
      </Presence>,
    );
    await waitFor(
      () => {
        expect(screen.queryByText("content")).toBeNull();
        expect(onExitComplete).toHaveBeenCalled();
      },
      { timeout: 500 },
    );
  });
});
