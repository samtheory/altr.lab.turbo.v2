import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field, FieldInput, FieldTextarea } from "./field";

describe("Field", () => {
  it.each(["top", "floating", "inline"] as const)(
    "associates the label with the control in %s layout",
    (layout) => {
      render(
        <Field label="Email" layout={layout}>
          <FieldInput />
        </Field>,
      );
      const input = screen.getByLabelText("Email");
      expect(input.tagName).toBe("INPUT");
    },
  );

  it("wires description and error through aria-describedby and aria-invalid", () => {
    render(
      <Field label="Username" description="Public handle" error="Taken">
        <FieldInput />
      </Field>,
    );
    const input = screen.getByLabelText("Username");
    const describedBy = input.getAttribute("aria-describedby")!.split(" ");
    expect(describedBy).toHaveLength(2);
    expect(document.getElementById(describedBy[0]!)!.textContent).toBe("Public handle");
    expect(document.getElementById(describedBy[1]!)!.textContent).toBe("Taken");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("marks the control box filled while it has a value", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Field label="Name" layout="floating">
        <FieldInput />
      </Field>,
    );
    const box = container.querySelector("[data-slot=field-control]")!;
    expect(box.hasAttribute("data-filled")).toBe(false);
    await user.type(screen.getByLabelText("Name"), "Ada");
    expect(box.hasAttribute("data-filled")).toBe(true);
    await user.clear(screen.getByLabelText("Name"));
    expect(box.hasAttribute("data-filled")).toBe(false);
  });

  it("starts filled from defaultValue and supports textarea", () => {
    const { container } = render(
      <Field label="Bio" layout="floating">
        <FieldTextarea defaultValue="Hello" />
      </Field>,
    );
    expect(
      container.querySelector("[data-slot=field-control]")!.hasAttribute("data-filled"),
    ).toBe(true);
    expect(screen.getByLabelText("Bio").tagName).toBe("TEXTAREA");
  });
});
