import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Field } from "./field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./input-group";

afterEach(() => vi.restoreAllMocks());

describe("InputGroup", () => {
  it("focuses the input when empty addon space is clicked", async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <InputGroupAddon data-testid="addon">
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="Site" />
      </InputGroup>,
    );
    await user.click(screen.getByTestId("addon"));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Site" }));
  });

  it("is a group and marks invalid children through aria-invalid", () => {
    render(
      <InputGroup aria-label="Email">
        <InputGroupInput aria-label="Email" aria-invalid />
      </InputGroup>,
    );
    const group = screen.getByRole("group", { name: "Email" });
    expect(group.className).toContain("has-[[aria-invalid=true]]:ring-destructive/30");
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
  });

  it("takes the Field's id and description inside a Field", () => {
    render(
      <Field label="Website" description="Your public site." error="Unreachable">
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput />
      </Field>,
    );
    const input = screen.getByLabelText("Website");
    expect(input.getAttribute("data-slot")).toBe("input-group-control");
    expect(input.getAttribute("aria-describedby")!.split(" ")).toHaveLength(2);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("buttons default to type=button and do not submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <InputGroup>
          <InputGroupInput aria-label="Query" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton>Clear</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>,
    );
    const button = screen.getByRole("button", { name: "Clear" });
    expect(button.getAttribute("type")).toBe("button");
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("warns when an icon-only button has no aria-label", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<InputGroupButton size="icon-xs">x</InputGroupButton>);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("aria-label"));
  });
});
