import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPanelList,
  NavigationMenuTrigger,
} from "./navigation-menu";

function Menu() {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem value="products">
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuPanelList>
              <li>
                <NavigationMenuLink href="#kit">Kit</NavigationMenuLink>
              </li>
            </NavigationMenuPanelList>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#docs" active>
            Docs
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

describe("NavigationMenu", () => {
  it("toggles a disclosure panel and wires aria-expanded", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole("button", { name: "Products" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "Kit" })).toBeTruthy();
    await user.click(trigger);
    await waitFor(() => expect(screen.queryByRole("link", { name: "Kit" })).toBeNull());
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    const trigger = screen.getByRole("button", { name: "Products" });
    await user.click(trigger);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Kit" }));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("link", { name: "Kit" })).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("moves between top-level items with arrow keys and marks the current page", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    screen.getByRole("button", { name: "Products" }).focus();
    await user.keyboard("{ArrowRight}");
    const docs = screen.getByRole("link", { name: "Docs" });
    expect(document.activeElement).toBe(docs);
    expect(docs.getAttribute("aria-current")).toBe("page");
  });
});
