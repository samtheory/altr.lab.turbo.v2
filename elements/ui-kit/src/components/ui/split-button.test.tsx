import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DropdownMenuItem } from "./dropdown-menu";
import { SplitButton, SplitButtonAction, SplitButtonMenu } from "./split-button";

function Example({ onSave = () => {}, onDraft = () => {} }: { onSave?: () => void; onDraft?: () => void }) {
  return (
    <SplitButton>
      <SplitButtonAction onClick={onSave}>Save</SplitButtonAction>
      <SplitButtonMenu>
        <DropdownMenuItem onSelect={onDraft}>Save as draft</DropdownMenuItem>
        <DropdownMenuItem>Publish</DropdownMenuItem>
      </SplitButtonMenu>
    </SplitButton>
  );
}

describe("SplitButton", () => {
  it("runs the action without opening the menu", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<Example onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens the menu from the icon and selects an item", async () => {
    const user = userEvent.setup();
    const onDraft = vi.fn();
    render(<Example onDraft={onDraft} />);
    const menuButton = screen.getByRole("button", { name: "More actions" });
    await user.click(menuButton);
    const menu = await screen.findByRole("menu");
    expect(menu.getAttribute("data-motion")).toBe("expand");
    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    await user.click(screen.getByRole("menuitem", { name: "Save as draft" }));
    expect(onDraft).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("opens from the keyboard on the icon", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const menuButton = screen.getByRole("button", { name: "More actions" });
    menuButton.focus();
    await user.keyboard("{ArrowDown}");
    await screen.findByRole("menu");
    expect(document.activeElement?.textContent).toBe("Save as draft");
  });
});
