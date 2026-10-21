import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "./field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

function FruitSelect({
  value,
  defaultValue,
  onValueChange,
  disabledItem,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabledItem?: boolean;
}) {
  return (
    <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange}>
      <SelectTrigger aria-label="Fruit">
        <SelectValue placeholder="Pick a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruit</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana" disabled={disabledItem}>
            Banana
          </SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("opens from the keyboard and focuses the first option", async () => {
    const user = userEvent.setup();
    render(<FruitSelect />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await screen.findByRole("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.textContent).toContain("Apple");
  });

  it("skips disabled items, wraps, and supports typeahead", async () => {
    const user = userEvent.setup();
    render(<FruitSelect disabledItem />);
    await user.click(screen.getByRole("combobox", { name: "Fruit" }));
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toContain("Cherry");
    await user.keyboard("{End}");
    expect(document.activeElement?.textContent).toContain("Cherry");
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toContain("Apple");
    await user.keyboard("c");
    expect(document.activeElement?.textContent).toContain("Cherry");
  });

  it("selecting an option updates value, closes, and restores focus", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<FruitSelect onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.click(trigger);
    await screen.findByRole("listbox");
    await user.keyboard("{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("apple");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(trigger.textContent).toContain("Apple");
  });

  it("supports controlled value and ignores disabled item activation", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = React.useState("cherry");
      return (
        <FruitSelect
          value={value}
          disabledItem
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    await user.click(trigger);
    // Open once so items register labels, then re-open for disabled check
    await screen.findByRole("listbox");
    expect((await screen.findByRole("option", { name: "Cherry" })).getAttribute("aria-selected")).toBe(
      "true",
    );
    const banana = screen.getByRole("option", { name: "Banana" });
    expect(banana.getAttribute("aria-disabled")).toBe("true");
    await user.click(banana);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("works inside Field", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Region">
        <Select defaultValue="eu">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eu">Europe</SelectItem>
            <SelectItem value="us">United States</SelectItem>
          </SelectContent>
        </Select>
      </Field>,
    );
    const trigger = screen.getByRole("combobox");
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "United States" }));
    await waitFor(() => expect(trigger.textContent).toContain("United States"));
  });
});
