import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useControllableState } from "./use-controllable-state";

describe("useControllableState", () => {
  it("supports uncontrolled mode", () => {
    const { result } = renderHook(() =>
      useControllableState({ defaultValue: "a" }),
    );
    expect(result.current[0]).toBe("a");
    act(() => result.current[1]("b"));
    expect(result.current[0]).toBe("b");
  });

  it("supports controlled mode", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControllableState({ value, onChange }),
      { initialProps: { value: "a" } },
    );
    act(() => result.current[1]("b"));
    expect(onChange).toHaveBeenCalledWith("b");
    expect(result.current[0]).toBe("a");
    rerender({ value: "b" });
    expect(result.current[0]).toBe("b");
  });
});
