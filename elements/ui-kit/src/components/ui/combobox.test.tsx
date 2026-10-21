import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxTrigger,
} from "./combobox";

function FruitCombobox({ onValueChange }: { onValueChange?: (v: string) => void }) {
  return (
    <Combobox onValueChange={onValueChange}>
      <ComboboxTrigger aria-label="Fruit" placeholder="Pick fruit" />
      <ComboboxContent>
        <ComboboxItem value="apple">Apple</ComboboxItem>
        <ComboboxItem value="banana">Banana</ComboboxItem>
        <ComboboxItem value="cherry">Cherry</ComboboxItem>
        <ComboboxEmpty>No fruit</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  );
}

describe("Combobox", () => {
  it("filters options and shows empty state", async () => {
    const user = userEvent.setup();
    render(<FruitCombobox />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    const input = await screen.findByRole("searchbox");
    await user.type(input, "zz");
    expect(screen.getByText("No fruit")).toBeTruthy();
    await user.clear(input);
    await user.type(input, "ban");
    expect(screen.getByRole("option", { name: "Banana" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Apple" })).toBeNull();
  });

  it("selects a filtered option and closes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitCombobox onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.click(trigger);
    await user.type(await screen.findByRole("searchbox"), "ch");
    await user.click(screen.getByRole("option", { name: "Cherry" }));
    expect(onValueChange).toHaveBeenCalledWith("cherry");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await waitFor(() => expect(trigger.textContent).toContain("Cherry"));
  });
});
