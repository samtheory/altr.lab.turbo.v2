"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPanelList,
  NavigationMenuTrigger,
} from "@altr/apolyx";

export default function NavigationMenuDemo() {
  return (
    <div className="min-h-56">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="kit">
            <NavigationMenuTrigger>Kit</NavigationMenuTrigger>
            <NavigationMenuContent className="w-80">
              <NavigationMenuPanelList>
                <li>
                  <NavigationMenuLink href="/docs/components/button">
                    <span className="font-medium">Components</span>
                    <span className="text-xs text-muted-foreground">Buttons, fields, overlays, data</span>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="/docs/charts">
                    <span className="font-medium">Charts</span>
                    <span className="text-xs text-muted-foreground">SVG + visx line and bar charts</span>
                  </NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="/docs/motion">
                    <span className="font-medium">Motion</span>
                    <span className="text-xs text-muted-foreground">Recipes with reduced-motion rules</span>
                  </NavigationMenuLink>
                </li>
              </NavigationMenuPanelList>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="guides">
            <NavigationMenuTrigger>Guides</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuPanelList>
                <li>
                  <NavigationMenuLink href="/docs/installation">Installation</NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="/docs/theming">Theming</NavigationMenuLink>
                </li>
                <li>
                  <NavigationMenuLink href="/docs/cli">CLI</NavigationMenuLink>
                </li>
              </NavigationMenuPanelList>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/docs" active>
              Docs
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
