import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  Timeline,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "./timeline";

function renderTimeline(value: number) {
  return render(
    <Timeline value={value} aria-label="Release">
      {[1, 2, 3].map((step) => (
        <TimelineItem key={step} step={step}>
          <TimelineSeparator />
          <TimelineIndicator />
          <TimelineTitle>Step {step}</TimelineTitle>
        </TimelineItem>
      ))}
    </Timeline>,
  );
}

describe("Timeline", () => {
  it("renders an ordered list with derived item states", () => {
    renderTimeline(2);
    const list = screen.getByRole("list", { name: "Release" });
    const items = screen.getAllByRole("listitem");
    expect(list.tagName).toBe("OL");
    expect(items.map((li) => li.dataset.state)).toEqual([
      "completed",
      "current",
      "upcoming",
    ]);
    expect(items[0]!.hasAttribute("data-completed")).toBe(true);
    expect(items[1]!.hasAttribute("data-completed")).toBe(true);
    expect(items[2]!.hasAttribute("data-completed")).toBe(false);
  });

  it("marks only the current step with aria-current", () => {
    renderTimeline(3);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("aria-current"))).toEqual([
      null,
      null,
      "step",
    ]);
  });

  it("treats value 0 as nothing reached", () => {
    renderTimeline(0);
    for (const li of screen.getAllByRole("listitem")) {
      expect(li.dataset.state).toBe("upcoming");
    }
  });

  it("forces stacked layout for horizontal timelines", () => {
    render(
      <Timeline orientation="horizontal" layout="alternate" aria-label="Row">
        <TimelineItem step={1}>
          <TimelineTitle>One</TimelineTitle>
        </TimelineItem>
      </Timeline>,
    );
    const list = screen.getByRole("list", { name: "Row" });
    expect(list.dataset.orientation).toBe("horizontal");
    expect(list.dataset.layout).toBe("stacked");
  });

  it("hides decorative parts from assistive tech", () => {
    const { container } = renderTimeline(1);
    for (const el of container.querySelectorAll(
      '[data-slot="timeline-indicator"], [data-slot="timeline-separator"]',
    )) {
      expect(el.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
