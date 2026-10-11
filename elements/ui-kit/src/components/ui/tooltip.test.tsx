import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

function Example() {
  return (
    <TooltipProvider delayDuration={50}>
      <Tooltip>
        <TooltipTrigger>Save</TooltipTrigger>
        <TooltipContent>Save changes</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

describe("Tooltip", () => {
  it("opens immediately on focus and wires aria-describedby", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Save" });
    fireEvent.focus(trigger);
    const tip = await screen.findByRole("tooltip");
    expect(trigger.getAttribute("aria-describedby")).toBe(tip.id);
    fireEvent.blur(trigger);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("opens after the hover delay and closes on Escape", async () => {
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Save" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    await screen.findByRole("tooltip");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });
});
