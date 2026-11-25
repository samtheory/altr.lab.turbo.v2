import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Dropzone, type DropzoneFile } from "./dropzone";

describe("Dropzone", () => {
  it("opens the file picker and reports accepted files", () => {
    const onFiles = vi.fn();
    render(<Dropzone onFiles={onFiles} multiple />);
    const zone = screen.getByRole("button", { name: /upload files/i });
    expect(zone).toBeTruthy();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalled();
    const [accepted] = onFiles.mock.calls[0];
    expect(accepted).toHaveLength(1);
    expect(accepted[0].name).toBe("note.txt");
  });

  it("renders controlled uploading rows", () => {
    const files: DropzoneFile[] = [
      { id: "1", name: "shot.png", size: 1024, status: "uploading", progress: 0.4 },
    ];
    render(<Dropzone files={files} />);
    expect(screen.getByText("shot.png")).toBeTruthy();
  });
});
