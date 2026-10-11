import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FocusScope } from "./focus-scope";

describe("FocusScope", () => {
  it("loops tab focus", async () => {
    const user = userEvent.setup();
    render(
      <FocusScope>
        <button type="button">one</button>
        <button type="button">two</button>
      </FocusScope>,
    );
    const one = screen.getByRole("button", { name: "one" });
    const two = screen.getByRole("button", { name: "two" });
    expect(document.activeElement).toBe(one);
    await user.tab();
    expect(document.activeElement).toBe(two);
    await user.tab();
    expect(document.activeElement).toBe(one);
  });
});
