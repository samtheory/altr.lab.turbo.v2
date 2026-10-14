import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "./field";
import { PasswordInput, PasswordStrength, getPasswordStrength } from "./password-input";

describe("PasswordInput", () => {
  it("toggles visibility and keeps focus and caret in the input", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="hunter22" />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.getAttribute("aria-controls")).toBe(input.id);

    await user.click(input);
    input.setSelectionRange(3, 3);
    await user.click(toggle);
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(3);
  });

  it("uses the Field box and wiring inside a Field", () => {
    render(
      <Field label="Password" description="8+ characters">
        <PasswordInput />
      </Field>,
    );
    const input = screen.getByLabelText("Password");
    expect(input.closest("[data-slot=input-group]")).toBeNull();
    expect(input.closest("[data-slot=field-control]")).not.toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
  });
});

describe("PasswordStrength", () => {
  it("scores rules and announces the level", () => {
    const { rerender } = render(<PasswordStrength value="" />);
    const meter = screen.getByRole("meter", { name: "Password strength" });
    expect(meter.getAttribute("aria-valuenow")).toBe("0");

    rerender(<PasswordStrength value="abcdefgh" />);
    expect(meter.getAttribute("aria-valuenow")).toBe("1");
    expect(screen.getByText("Weak").getAttribute("aria-live")).toBe("polite");

    rerender(<PasswordStrength value="Abcdefg1!" />);
    expect(meter.getAttribute("aria-valuenow")).toBe("4");
    expect(screen.getByText("Strong")).toBeTruthy();
  });

  it("accepts an external score and renders a checklist", () => {
    render(<PasswordStrength value="x" score={2} max={4} variant="both" />);
    expect(screen.getByText("Fair")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
  });

  it("maps ratios to levels", () => {
    expect(getPasswordStrength(0, 4, true)).toBe("empty");
    expect(getPasswordStrength(1, 4)).toBe("weak");
    expect(getPasswordStrength(2, 4)).toBe("fair");
    expect(getPasswordStrength(3, 4)).toBe("good");
    expect(getPasswordStrength(4, 4)).toBe("strong");
  });
});
