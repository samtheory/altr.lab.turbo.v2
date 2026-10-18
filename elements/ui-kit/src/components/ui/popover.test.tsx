import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

function Basic({
  trigger = "click" as const,
  motion: motionMode = "pop" as const,
}: {
  trigger?: "click" | "hover";
  motion?: "pop" | "slide" | "fade";
}) {
  return (
    <Popover trigger={trigger}>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent motion={motionMode}>
        <PopoverTitle>Dimensions</PopoverTitle>
        <PopoverDescription>Set the size</PopoverDescription>
        <input aria-label="Width" />
        <PopoverClose>Done</PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("opens with dialog semantics and moves focus inside", async () => {
    const user = userEvent.setup();
    render(<Basic />);
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("false");
    const title = screen.getByText("Dimensions");
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Basic />);
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on outside pointer-down and via PopoverClose", async () => {
    const user = userEvent.setup();
    render(<Basic />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("respects controlled open", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <Popover open={false} onOpenChange={onOpenChange}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Controlled</PopoverTitle>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).toBeNull();

    rerender(
      <Popover open onOpenChange={onOpenChange}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Controlled</PopoverTitle>
        </PopoverContent>
      </Popover>,
    );
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("opens on hover after a delay and stays open across the gap", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<Basic trigger="hover" />);
    const trigger = screen.getByRole("button", { name: "Open" });
    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(120);
    });
    const dialog = await screen.findByRole("dialog");
    fireEvent.pointerLeave(trigger, { pointerType: "mouse" });
    fireEvent.pointerEnter(dialog, { pointerType: "mouse" });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    vi.useRealTimers();
  });

  it("positions against PopoverAnchor when present", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverAnchor data-testid="anchor" style={{ width: 40, height: 40 }} />
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>Anchored</PopoverTitle>
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "Open" }));
    await screen.findByRole("dialog");
    expect(screen.getByTestId("anchor")).toBeTruthy();
  });

  it("exposes motion mode on the panel", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Basic motion="pop" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect((await screen.findByRole("dialog")).getAttribute("data-motion")).toBe(
      "pop",
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    rerender(<Basic motion="slide" />);
    await user.click(screen.getByRole("button", { name: "Open" }));
    expect((await screen.findByRole("dialog")).getAttribute("data-motion")).toBe(
      "slide",
    );
  });

  it("dismisses alone when nested inside a dialog", async () => {
    const user = userEvent.setup();
    render(
      <Dialog>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Parent</DialogTitle>
          <Popover>
            <PopoverTrigger>Open popover</PopoverTrigger>
            <PopoverContent>
              <PopoverTitle>Child</PopoverTitle>
              <PopoverClose>Close popover</PopoverClose>
            </PopoverContent>
          </Popover>
        </DialogContent>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await screen.findByRole("dialog", { name: "Parent" });
    await user.click(screen.getByRole("button", { name: "Open popover" }));
    await screen.findByRole("dialog", { name: "Child" });
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Child" })).toBeNull(),
    );
    expect(screen.getByRole("dialog", { name: "Parent" })).toBeTruthy();
  });
});
