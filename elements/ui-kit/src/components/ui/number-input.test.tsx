import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NumberInput, parseLocaleNumber } from "./number-input";

afterEach(() => vi.useRealTimers());

describe("parseLocaleNumber", () => {
  it("parses currency and group separators", () => {
    expect(parseLocaleNumber("$1,200.50", "en-US")).toBe(1200.5);
    expect(parseLocaleNumber("1.234,5 €", "de-DE")).toBe(1234.5);
    expect(parseLocaleNumber("-12", "en-US")).toBe(-12);
    expect(parseLocaleNumber("25%", "en-US", { style: "percent" })).toBe(0.25);
    expect(parseLocaleNumber("", "en-US")).toBeNull();
    expect(Number.isNaN(parseLocaleNumber("abc", "en-US"))).toBe(true);
  });
});

describe("NumberInput", () => {
  it("is a spinbutton driven by Arrow, Page, Home and End", async () => {
    const user = userEvent.setup();
    render(<NumberInput aria-label="Qty" defaultValue={5} min={0} max={50} />);
    const input = screen.getByRole("spinbutton", { name: "Qty" });
    await user.click(input);
    await user.keyboard("{ArrowUp}");
    expect(input.getAttribute("aria-valuenow")).toBe("6");
    await user.keyboard("{Shift>}{ArrowDown}{/Shift}");
    expect(input.getAttribute("aria-valuenow")).toBe("0");
    await user.keyboard("{PageUp}");
    expect(input.getAttribute("aria-valuenow")).toBe("10");
    await user.keyboard("{End}");
    expect(input.getAttribute("aria-valuenow")).toBe("50");
    await user.keyboard("{Home}");
    expect(input.getAttribute("aria-valuenow")).toBe("0");
  });

  it("clamps on blur and reverts invalid text", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="Qty" defaultValue={3} max={10} onValueChange={onValueChange} />);
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "99");
    await user.tab();
    expect(input.getAttribute("aria-valuenow")).toBe("10");
    expect(onValueChange).toHaveBeenLastCalledWith(10);

    await user.tripleClick(input);
    await user.keyboard("abc");
    await user.tab();
    expect(input.value).toBe("10");
  });

  it("formats when blurred and shows the raw number while focused", async () => {
    const user = userEvent.setup();
    render(
      <NumberInput
        aria-label="Price"
        defaultValue={1200.5}
        locale="en-US"
        format={{ style: "currency", currency: "USD" }}
      />,
    );
    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    expect(input.value).toBe("$1,200.50");
    expect(input.getAttribute("aria-valuetext")).toBe("$1,200.50");
    await user.click(input);
    expect(input.value).toBe("1200.5");
  });

  it("carries the raw value in a hidden input", async () => {
    const user = userEvent.setup();
    const { container } = render(<NumberInput aria-label="Seats" name="seats" defaultValue={2} />);
    const hidden = container.querySelector<HTMLInputElement>("input[type=hidden][name=seats]")!;
    expect(hidden.value).toBe("2");
    await user.click(screen.getByRole("spinbutton"));
    await user.keyboard("{ArrowUp}");
    expect(hidden.value).toBe("3");
    expect(screen.getByRole("spinbutton").getAttribute("name")).toBeNull();
  });

  it("repeats while a stepper is held", () => {
    vi.useFakeTimers();
    render(<NumberInput aria-label="Qty" defaultValue={0} />);
    const plus = screen.getByRole("button", { name: "Increase" });
    const input = screen.getByRole("spinbutton");
    fireEvent.pointerDown(plus);
    expect(input.getAttribute("aria-valuenow")).toBe("1");
    act(() => vi.advanceTimersByTime(400 + 60 * 3));
    expect(input.getAttribute("aria-valuenow")).toBe("4");
    fireEvent.pointerUp(plus);
    act(() => vi.advanceTimersByTime(600));
    expect(input.getAttribute("aria-valuenow")).toBe("4");
  });

  it("disables the stepper at a bound", () => {
    render(<NumberInput aria-label="Qty" defaultValue={0} min={0} />);
    expect((screen.getByRole("button", { name: "Decrease" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
