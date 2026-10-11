import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  DismissableLayer,
  getDismissableLayerCount,
} from "./dismissable-layer";

describe("DismissableLayer", () => {
  it("dismisses on Escape and nests so only the top layer dismisses", async () => {
    const user = userEvent.setup();
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <DismissableLayer onDismiss={outer}>
        <DismissableLayer onDismiss={inner}>
          <button type="button">inner</button>
        </DismissableLayer>
      </DismissableLayer>,
    );
    expect(getDismissableLayerCount()).toBe(2);
    screen.getByRole("button", { name: "inner" }).focus();
    await user.keyboard("{Escape}");
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("dismisses only the top layer on outside pointer-down", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <DismissableLayer onDismiss={outer}>
        <span>outer content</span>
        <DismissableLayer onDismiss={inner}>
          <span>inner content</span>
        </DismissableLayer>
      </DismissableLayer>,
    );
    fireEvent.pointerDown(screen.getByText("outer content"));
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it("treats ignoreRefs as inside and respects disableOutsideDismiss", () => {
    const onDismiss = vi.fn();
    function Harness() {
      const trigger = React.useRef<HTMLButtonElement>(null);
      return (
        <>
          <button ref={trigger} type="button">
            trigger
          </button>
          <DismissableLayer onDismiss={onDismiss} ignoreRefs={[trigger]}>
            layer
          </DismissableLayer>
        </>
      );
    }
    const { unmount } = render(<Harness />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "trigger" }));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(document.body);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    unmount();

    const alertDismiss = vi.fn();
    render(
      <DismissableLayer onDismiss={alertDismiss} disableOutsideDismiss>
        alert
      </DismissableLayer>,
    );
    fireEvent.pointerDown(document.body);
    expect(alertDismiss).not.toHaveBeenCalled();
  });

  it("passive layers close on outside pointer-down without consuming it", () => {
    const passive = vi.fn();
    const modal = vi.fn();
    render(
      <>
        <DismissableLayer onDismiss={modal}>modal</DismissableLayer>
        <DismissableLayer passive onDismiss={passive}>
          tip
        </DismissableLayer>
      </>,
    );
    fireEvent.pointerDown(document.body);
    expect(passive).toHaveBeenCalledTimes(1);
    expect(modal).toHaveBeenCalledTimes(1);
  });
});
