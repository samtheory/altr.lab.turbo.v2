import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Github } from "lucide-react";

import {
  ButtonGroup,
  ButtonGroupAddon,
  ButtonGroupItem,
  ButtonGroupSeparator,
} from "./button-group";

describe("ButtonGroup", () => {
  it("keeps the action and the addon in one group, with a separator between them", () => {
    render(
      <ButtonGroup aria-label="Star repository">
        <ButtonGroupItem>Star</ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupAddon>
          <Github aria-hidden />
          15K
        </ButtonGroupAddon>
      </ButtonGroup>,
    );

    const group = screen.getByRole("group", { name: "Star repository" });
    expect(group.querySelector("[data-slot=button-group-separator]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Star" })).toBeTruthy();
    expect(group.textContent).toContain("15K");
  });

  it("does not treat the addon as a button", async () => {
    const onStar = vi.fn();
    const user = userEvent.setup();
    render(
      <ButtonGroup>
        <ButtonGroupItem onClick={onStar}>Star</ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupAddon>15K</ButtonGroupAddon>
      </ButtonGroup>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Star" }));
    expect(onStar).toHaveBeenCalledTimes(1);
  });
});
