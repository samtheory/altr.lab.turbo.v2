import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { Portal } from "./portal";

describe("Portal", () => {
  it("renders into a container after mount", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(
      <Portal container={container}>
        <span>ported</span>
      </Portal>,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("ported");
    });
    expect(screen.getByText("ported")).toBeTruthy();
  });
});
