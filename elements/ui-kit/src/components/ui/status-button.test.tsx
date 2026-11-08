import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { buttonTones } from "./button";
import { StatusButton, statusLabels } from "./status-button";

describe("StatusButton", () => {
  it("renders each tone with its label and the status face", () => {
    render(
      <>
        {buttonTones.map((tone) => (
          <StatusButton key={tone} tone={tone} />
        ))}
      </>,
    );

    for (const tone of buttonTones) {
      const button = screen.getByRole("button", { name: statusLabels[tone] });
      expect(button.className).toContain("apolyx-status");
      expect(button.getAttribute("data-tone")).toBe(tone);
    }
  });

  it("uses the inset face when asked", () => {
    render(
      <StatusButton tone="success" variant="status-inset">
        Shipped
      </StatusButton>,
    );
    const button = screen.getByRole("button", { name: "Shipped" });
    expect(button.className).toContain("apolyx-status-inset");
    expect(button.className).toContain("shadow-[inset_0_0_0_2px_var(--status-wash)]");
  });
});
