import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { masks } from "../../lib/mask";
import { Field } from "./field";
import { InputGroup, InputGroupInput } from "./input-group";
import { MaskedInput } from "./input-mask";

describe("MaskedInput", () => {
  it("formats while typing and reports raw and formatted values", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<MaskedInput aria-label="Phone" mask={masks.phoneUS} onValueChange={onValueChange} />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    expect(input.placeholder).toBe("(___) ___-____");
    expect(input.getAttribute("inputmode")).toBe("numeric");
    await user.type(input, "5551234567");
    expect(input.value).toBe("(555) 123-4567");
    expect(onValueChange).toHaveBeenLastCalledWith("5551234567", "(555) 123-4567");
  });

  it("keeps the caret after the typed character when typing over a literal", async () => {
    const user = userEvent.setup();
    render(<MaskedInput aria-label="Phone" mask={masks.phoneUS} defaultValue="555123" />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    expect(input.value).toBe("(555) 123");
    input.focus();
    input.setSelectionRange(4, 4);
    await user.keyboard("9");
    expect(input.value).toBe("(555) 912-3");
    expect(input.selectionStart).toBe(7);
  });

  it("deletes the previous token when Backspace lands on a literal", async () => {
    const user = userEvent.setup();
    render(<MaskedInput aria-label="Phone" mask={masks.phoneUS} defaultValue="5551234" />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(6, 6);
    await user.keyboard("{Backspace}");
    expect(input.value).toBe("(551) 234");
    expect(input.selectionStart).toBe(3);
  });

  it("re-applies the mask to pasted text and keeps the tail of long pastes", async () => {
    const user = userEvent.setup();
    render(<MaskedInput aria-label="Phone" mask={masks.phoneUS} />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    await user.click(input);
    await user.paste("+1 (555) 123-4567");
    expect(input.value).toBe("(555) 123-4567");
  });

  it("submits raw by default and formatted on request", () => {
    const { container } = render(
      <form>
        <MaskedInput aria-label="A" name="a" mask={masks.date} defaultValue="01022026" />
        <MaskedInput aria-label="B" name="b" mask={masks.date} defaultValue="01022026" submit="formatted" />
      </form>,
    );
    const data = new FormData(container.querySelector("form")!);
    expect(data.get("a")).toBe("01022026");
    expect(data.get("b")).toBe("01/02/2026");
  });

  it("switches the card layout by brand", async () => {
    const user = userEvent.setup();
    render(<MaskedInput aria-label="Card" mask={masks.card} />);
    const input = screen.getByLabelText("Card") as HTMLInputElement;
    await user.type(input, "378282246310005");
    expect(input.value).toBe("3782 822463 10005");
  });

  it("reports completeness on blur", async () => {
    const user = userEvent.setup();
    const onCompleteChange = vi.fn();
    render(
      <Field label="Date">
        <MaskedInput mask={masks.date} showGuide onCompleteChange={onCompleteChange} />
      </Field>,
    );
    await user.type(screen.getByLabelText("Date"), "0412");
    await user.tab();
    expect(onCompleteChange).toHaveBeenLastCalledWith(false);
  });

  it("renders borderless inside a Field or an InputGroup", () => {
    render(
      <>
        <Field label="Zip">
          <MaskedInput mask={masks.zipUS} />
        </Field>
        <InputGroup>
          <MaskedInput aria-label="Time" mask={masks.time} />
          <InputGroupInput aria-label="Other" />
        </InputGroup>
      </>,
    );
    expect(screen.getByLabelText("Zip").getAttribute("data-slot")).toBe("input-group-control");
    expect(screen.getByLabelText("Time").getAttribute("data-slot")).toBe("input-group-control");
  });
});
