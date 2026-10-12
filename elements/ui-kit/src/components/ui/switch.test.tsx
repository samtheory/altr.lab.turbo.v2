import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Switch } from "./switch";

describe("Switch", () => {
  it("toggles with keyboard", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Notifications" />);
    const sw = screen.getByRole("switch", { name: "Notifications" });
    sw.focus();
    await user.keyboard("{Enter}");
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("supports controlled mode and form name", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    const { container } = render(
      <Switch
        aria-label="Notifications"
        checked={false}
        onCheckedChange={onCheckedChange}
        name="notify"
      />,
    );
    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(container.querySelector('input[name="notify"]')).toBeTruthy();
  });

  it("toggles once per click", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Wifi" />);
    const sw = screen.getByRole("switch");
    await user.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("true");
    await user.click(sw);
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });

  it("commits on drag past the midpoint and ignores the trailing click", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Wifi" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch");
    fireEvent.pointerDown(sw, { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.pointerMove(sw, { pointerId: 1, clientX: 8 });
    fireEvent.pointerMove(sw, { pointerId: 1, clientX: 16 });
    fireEvent.pointerUp(sw, { pointerId: 1, clientX: 16 });
    fireEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(sw.getAttribute("aria-checked")).toBe("true");
  });

  it("snaps back when a drag ends before the midpoint", () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Wifi" onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole("switch");
    fireEvent.pointerDown(sw, { pointerId: 1, button: 0, clientX: 0 });
    fireEvent.pointerMove(sw, { pointerId: 1, clientX: 5 });
    fireEvent.pointerUp(sw, { pointerId: 1, clientX: 5 });
    fireEvent.click(sw);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(sw.getAttribute("aria-checked")).toBe("false");
  });
});
