import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

function Example({ manual = false }: { manual?: boolean }) {
  return (
    <Tabs defaultValue="a" activationMode={manual ? "manual" : "automatic"}>
      <TabsList aria-label="Sections">
        <TabsTrigger value="a">Alpha</TabsTrigger>
        <TabsTrigger value="b">Beta</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Panel A</TabsContent>
      <TabsContent value="b">Panel B</TabsContent>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("links tabs and panels with ids", () => {
    render(<Example />);
    const tab = screen.getByRole("tab", { name: "Alpha" });
    const panel = screen.getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("automatic mode selects on arrow focus", async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel B");
  });

  it("supports controlled value", async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    function Controlled() {
      const [value, setValue] = React.useState("a");
      return (
        <Tabs
          value={value}
          onValueChange={(v) => {
            seen.push(v);
            setValue(v);
          }}
        >
          <TabsList>
            <TabsTrigger value="a">Alpha</TabsTrigger>
            <TabsTrigger value="b">Beta</TabsTrigger>
          </TabsList>
          <TabsContent value="a">Panel A</TabsContent>
          <TabsContent value="b">Panel B</TabsContent>
        </Tabs>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("tab", { name: "Beta" }));
    expect(seen).toContain("b");
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel B");
  });

  it("manual mode waits for Enter", async () => {
    const user = userEvent.setup();
    render(<Example manual />);
    screen.getByRole("tab", { name: "Alpha" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.textContent).toBe("Beta");
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel A");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tabpanel").textContent).toBe("Panel B");
  });
});
