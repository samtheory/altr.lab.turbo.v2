import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field, FieldCounter, FieldInput, FieldTextarea } from "./field";

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

  it("counts characters and flips the field invalid past max", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Field label="Bio">
        <FieldInput />
        <FieldCounter max={5} />
      </Field>,
    );
    const input = screen.getByLabelText("Bio");
    const counter = container.querySelector("[data-slot=field-counter]")!;
    expect(counter.textContent).toBe("0 / 5");
    await user.type(input, "Hello");
    expect(counter.textContent).toBe("5 / 5");
    expect(counter.getAttribute("data-state")).toBe("near");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    await user.type(input, "!");
    expect(counter.getAttribute("data-state")).toBe("over");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("renders an array error as a list inside one alert", () => {
    render(
      <Field label="Password" error={["Too short", "Needs a number"]}>
        <FieldInput />
      </Field>,
    );
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.querySelectorAll("li")).toHaveLength(2);
  });

  it("keeps label and description wiring in horizontal orientation", () => {
    render(
      <Field label="Display name" orientation="horizontal" description="Shown on posts" optional>
        <FieldInput />
      </Field>,
    );
    const input = screen.getByLabelText(/Display name/);
    const describedBy = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy)!.textContent).toBe("Shown on posts");
    expect(screen.getByText("(optional)")).toBeTruthy();
  });

  it("renders labelAside next to the label", () => {
    render(
      <Field label="Password" labelAside={<a href="#reset">Forgot password?</a>}>
        <FieldInput type="password" />
      </Field>,
    );
    expect(screen.getByRole("link", { name: "Forgot password?" })).toBeTruthy();
    expect(screen.getByLabelText("Password").tagName).toBe("INPUT");
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
