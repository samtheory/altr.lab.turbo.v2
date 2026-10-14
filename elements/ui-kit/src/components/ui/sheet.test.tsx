import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

function Basic({ side }: { side?: "left" | "right" | "top" | "bottom" }) {
  return (
    <Sheet>
      <SheetTrigger>Menu</SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Pick a page</SheetDescription>
        </SheetHeader>
        <a href="#home">Home</a>
      </SheetContent>
    </Sheet>
  );
}

describe("Sheet", () => {
  it("opens a labelled modal dialog on the requested side", async () => {
    const user = userEvent.setup();
    render(<Basic side="left" />);
    await user.click(screen.getByRole("button", { name: "Menu" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("data-side")).toBe("left");
    expect(dialog.getAttribute("aria-labelledby")).toBe(
      screen.getByText("Navigation").id,
    );
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and via the built-in close button, restoring focus", async () => {
    const user = userEvent.setup();
    render(<Basic />);
    const trigger = screen.getByRole("button", { name: "Menu" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
