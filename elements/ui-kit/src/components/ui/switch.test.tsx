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

  it("does not change the thumb width on the pointer-down tick", () => {
    const { container } = render(<Switch aria-label="Wifi" />);
    const sw = screen.getByRole("switch");
    const thumb = container.querySelector<HTMLElement>('[data-slot="switch-thumb"]')!;
    const before = thumb.style.width;
    fireEvent.pointerDown(sw, { pointerId: 1, button: 0, clientX: 0 });
    expect(thumb.style.width).toBe(before);
    expect(before).toBe("20px");
  });

  it("exposes tone and swaps thumb icons by state", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Switch
        aria-label="Theme"
        tone="success"
        icons={{ checked: <i data-testid="on" />, unchecked: <i data-testid="off" /> }}
      />,
    );
    const sw = screen.getByRole("switch");
    expect(sw.getAttribute("data-tone")).toBe("success");
    const active = () =>
      container.querySelector('[data-slot="switch-icon"][data-active]')?.firstElementChild;
    expect(active()?.getAttribute("data-testid")).toBe("off");
    await user.click(sw);
    expect(active()?.getAttribute("data-testid")).toBe("on");
  });

  it("renders track labels for both states", () => {
    render(<Switch aria-label="Mode" labels={{ checked: "On", unchecked: "Off" }} size="lg" />);
    const sw = screen.getByRole("switch");
    expect(sw.textContent).toContain("On");
    expect(sw.textContent).toContain("Off");
    expect(sw.getAttribute("data-size")).toBe("lg");
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
