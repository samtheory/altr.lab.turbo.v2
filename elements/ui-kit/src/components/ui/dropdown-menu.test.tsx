import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function Menu({ onEdit = () => {} }: { onEdit?: () => void }) {
  const [pinned, setPinned] = React.useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={pinned} onCheckedChange={setPinned}>
          Pinned
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("opens from the keyboard and focuses the first item", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await screen.findByRole("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Edit");
  });

  it("skips disabled items, wraps, and supports typeahead", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Duplicate");
    await user.keyboard("{End}");
    expect(document.activeElement?.textContent).toBe("Pinned");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Edit");
    await user.keyboard("d");
    expect(document.activeElement?.textContent).toBe("Duplicate");
  });

  it("selecting an item calls onSelect, closes, and restores focus", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<Menu onEdit={onEdit} />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);
    await screen.findByRole("menu");
    await user.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("Escape closes; checkbox items toggle aria-checked", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    const item = await screen.findByRole("menuitemcheckbox");
    expect(item.getAttribute("aria-checked")).toBe("false");
    await user.click(item);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    await user.click(screen.getByRole("button", { name: "Actions" }));
    expect(
      (await screen.findByRole("menuitemcheckbox")).getAttribute("aria-checked"),
    ).toBe("true");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});
