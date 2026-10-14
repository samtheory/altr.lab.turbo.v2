import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "./field";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, sanitizeOTP } from "./input-otp";

function SixDigits(props: Partial<React.ComponentProps<typeof InputOTP>>) {
  return (
    <InputOTP maxLength={6} aria-label="Code" {...props}>
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}

const slotText = (container: HTMLElement) =>
  [...container.querySelectorAll("[data-slot=input-otp-slot]")].map((s) => s.textContent).join("");

describe("sanitizeOTP", () => {
  it("filters by pattern and uppercases letters", () => {
    expect(sanitizeOTP("1a2-3", "digits", "none")).toBe("123");
    expect(sanitizeOTP("ab-12", "alphanumeric", "upper")).toBe("AB12");
    expect(sanitizeOTP("ab12", "alpha", "none")).toBe("ab");
    expect(sanitizeOTP("a1b2", /[ab]/, "none")).toBe("ab");
  });
});

describe("InputOTP", () => {
  it("fills slots as you type and rejects characters outside the pattern", async () => {
    const user = userEvent.setup();
    const { container } = render(<SixDigits />);
    const input = screen.getByLabelText("Code") as HTMLInputElement;
    expect(input.getAttribute("autocomplete")).toBe("one-time-code");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    await user.click(input);
    await user.keyboard("1a2b3");
    expect(input.value).toBe("123");
    expect(slotText(container)).toBe("123");
  });

  it("distributes a paste and fires onComplete once", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const { container } = render(<SixDigits onComplete={onComplete} />);
    const input = screen.getByLabelText("Code") as HTMLInputElement;
    await user.click(input);
    await user.paste("12-34-56-78");
    expect(input.value).toBe("123456");
    expect(slotText(container)).toBe("123456");
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("deletes with Backspace and completes again after refilling", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<SixDigits defaultValue="12345" onComplete={onComplete} />);
    const input = screen.getByLabelText("Code") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(5, 5);
    await user.keyboard("{Backspace}");
    expect(input.value).toBe("1234");
    await user.keyboard("56");
    expect(input.value).toBe("123456");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("masks characters", () => {
    const { container } = render(<SixDigits defaultValue="4821" mask />);
    expect(slotText(container)).toBe("••••");
  });

  it("styles every slot invalid from the root", () => {
    const { container } = render(<SixDigits aria-invalid />);
    const slots = container.querySelectorAll("[data-slot=input-otp-slot]");
    expect([...slots].every((s) => s.hasAttribute("data-invalid"))).toBe(true);
    expect(screen.getByLabelText("Code").getAttribute("aria-invalid")).toBe("true");
  });

  it("submits its value under name", () => {
    const { container } = render(
      <form>
        <SixDigits name="code" defaultValue="654321" />
      </form>,
    );
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("code")).toBe("654321");
  });

  it("uses the Field label and skips the Field box", () => {
    const { container } = render(
      <Field label="Verification code" description="Sent to your phone">
        <InputOTP maxLength={4}>
          <InputOTPGroup>
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </Field>,
    );
    const input = screen.getByLabelText("Verification code");
    expect(input.getAttribute("data-slot")).toBe("input-otp-input");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
    expect(container.querySelector("[data-slot=field-control]")?.hasAttribute("data-variant")).toBe(false);
  });
});
