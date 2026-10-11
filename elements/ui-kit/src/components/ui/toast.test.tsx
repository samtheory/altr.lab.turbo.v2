import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Toaster, toast } from "./toast";

afterEach(() => {
  act(() => toast.dismiss());
});

describe("Toast", () => {
  it("renders into a labelled region with status/alert roles", async () => {
    render(<Toaster />);
    expect(screen.getByRole("region", { name: /notifications/i })).toBeTruthy();
    act(() => {
      toast.success("Saved");
      toast.error("Failed");
    });
    const status = await screen.findByRole("status");
    expect(status.textContent).toContain("Saved");
    expect(status.getAttribute("aria-live")).toBe("polite");
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
  });

  it("caps visible toasts and dismisses via the close button", async () => {
    const user = userEvent.setup();
    render(<Toaster max={2} />);
    act(() => {
      toast("One", { duration: Infinity });
      toast("Two", { duration: Infinity });
      toast("Three", { duration: Infinity });
    });
    expect(screen.queryByText("One")).toBeNull();
    expect(screen.getByText("Three")).toBeTruthy();
    await user.click(
      screen.getAllByRole("button", { name: "Dismiss notification" })[1]!,
    );
    await waitFor(() => expect(screen.queryByText("Three")).toBeNull());
  });

  it("auto-dismisses after duration and resolves promises", async () => {
    render(<Toaster />);
    act(() => {
      toast.info("Quick", { duration: 50 });
    });
    await screen.findByText("Quick");
    await waitFor(() => expect(screen.queryByText("Quick")).toBeNull());

    let resolve!: (v: string) => void;
    act(() => {
      toast.promise(new Promise<string>((r) => (resolve = r)), {
        loading: "Uploading",
        success: (v) => `Done ${v}`,
        error: "Oops",
      });
    });
    await screen.findByText("Uploading");
    await act(async () => resolve("file"));
    await screen.findByText("Done file");
  });
});
