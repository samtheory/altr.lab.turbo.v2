import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FieldSet } from "./field-set";
import { SwitchCard, SwitchField } from "./switch-field";

describe("SwitchField", () => {
  it("toggles once when the label text is clicked and wires the description", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <SwitchField
        label="Airplane mode"
        description="Turns off wireless connections."
        onCheckedChange={onCheckedChange}
      />,
    );
    const sw = screen.getByRole("switch", { name: "Airplane mode" });
    await user.click(screen.getByText("Airplane mode"));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    const describedBy = sw.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)?.textContent).toBe(
      "Turns off wireless connections.",
    );
  });

  it("mirrors state on the row", async () => {
    const user = userEvent.setup();
    const { container } = render(<SwitchField label="Wifi" />);
    const row = container.querySelector('[data-slot="switch-field"]')!;
    expect(row.getAttribute("data-state")).toBe("unchecked");
    await user.click(screen.getByRole("switch"));
    expect(row.getAttribute("data-state")).toBe("checked");
  });
});

describe("SwitchCard", () => {
  it("toggles when the card is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SwitchCard title="Push notifications" description="Get alerts on this device." />,
    );
    await user.click(screen.getByText("Get alerts on this device."));
    expect(screen.getByRole("switch", { name: "Push notifications" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(container.querySelector('[data-slot="switch-card"]')?.getAttribute("data-state")).toBe(
      "checked",
    );
  });
});

describe("FieldSet", () => {
  it("disables every switch inside", () => {
    render(
      <FieldSet legend="Notifications" disabled>
        <SwitchField label="Email" />
        <SwitchField label="SMS" />
      </FieldSet>,
    );
    expect(screen.getByRole("group", { name: "Notifications" })).toBeTruthy();
    for (const sw of screen.getAllByRole("switch")) {
      expect((sw as HTMLButtonElement).matches(":disabled")).toBe(true);
    }
  });
});
