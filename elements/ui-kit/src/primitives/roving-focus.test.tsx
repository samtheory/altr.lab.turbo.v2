import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RovingFocusGroup, RovingFocusItem } from "./roving-focus";

describe("RovingFocus", () => {
  it("moves with arrows and Home/End", async () => {
    const user = userEvent.setup();
    render(
      <RovingFocusGroup defaultValue="a">
        <RovingFocusItem id="a">Alpha</RovingFocusItem>
        <RovingFocusItem id="b">Beta</RovingFocusItem>
        <RovingFocusItem id="c" disabled>
          Gamma
        </RovingFocusItem>
        <RovingFocusItem id="d">Delta</RovingFocusItem>
      </RovingFocusGroup>,
    );
    const alpha = screen.getByRole("button", { name: "Alpha" });
    alpha.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Beta" }),
    );
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Delta" }),
    );
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(alpha);
  });
});
