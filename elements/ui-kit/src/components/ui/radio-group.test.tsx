import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";

describe("RadioGroup", () => {
  it("selects via click and keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup defaultValue="a" onValueChange={onValueChange}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="a" id="a" aria-label="A" />
          <Label htmlFor="a">A</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="b" id="b" aria-label="B" />
          <Label htmlFor="b">B</Label>
        </div>
      </RadioGroup>,
    );
    const a = screen.getByRole("radio", { name: "A" });
    const b = screen.getByRole("radio", { name: "B" });
    expect(a.getAttribute("aria-checked")).toBe("true");
    await user.click(b);
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(b.getAttribute("aria-checked")).toBe("true");
  });
});
