import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

describe("Accordion", () => {
  it("toggles a single item", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Alpha</AccordionTrigger>
          <AccordionContent>Alpha body</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Beta</AccordionTrigger>
          <AccordionContent>Beta body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    expect(screen.queryByText("Alpha body")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Alpha" }));
    expect(screen.getByText("Alpha body")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Beta" }));
    expect(screen.queryByText("Alpha body")).toBeNull();
    expect(screen.getByText("Beta body")).toBeTruthy();
  });
});
