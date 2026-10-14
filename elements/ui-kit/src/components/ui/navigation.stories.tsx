import type { Meta, StoryObj } from "@storybook/react-vite";
import { BarChart3, Home, Menu, Settings, Users } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogSize,
} from "./dialog";
import { NavList, NavListGroup, NavListItem } from "./nav-list";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPanelList,
  NavigationMenuTrigger,
} from "./navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "./sheet";

const meta = {
  title: "UI/Navigation",
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function SidebarLinks() {
  return (
    <NavList>
      <NavListGroup label="Workspace">
        <NavListItem href="#" active>
          <Home /> Overview
        </NavListItem>
        <NavListItem href="#">
          <BarChart3 /> Analytics
        </NavListItem>
        <NavListItem href="#">
          <Users /> Team
        </NavListItem>
      </NavListGroup>
      <NavListGroup label="Account">
        <NavListItem href="#">
          <Settings /> Settings
        </NavListItem>
        <NavListItem href="#" disabled>
          Billing
        </NavListItem>
      </NavListGroup>
    </NavList>
  );
}

export const AppShell: Story = {
  render: () => (
    <div className="min-h-[520px]">
      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open sidebar">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Apolyx</SheetTitle>
              <SheetDescription>Workspace navigation</SheetDescription>
            </SheetHeader>
            <SidebarLinks />
          </SheetContent>
        </Sheet>
        <span className="font-display text-sm font-semibold">Apolyx</span>
        <NavigationMenu className="ml-4">
          <NavigationMenuList>
            <NavigationMenuItem value="product">
              <NavigationMenuTrigger>Product</NavigationMenuTrigger>
              <NavigationMenuContent className="w-80">
                <NavigationMenuPanelList>
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium">Components</span>
                      <span className="text-xs text-muted-foreground">
                        Buttons, fields, overlays, data
                      </span>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">
                      <span className="font-medium">Charts</span>
                      <span className="text-xs text-muted-foreground">
                        SVG + visx line and bar charts
                      </span>
                    </NavigationMenuLink>
                  </li>
                </NavigationMenuPanelList>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem value="resources">
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuPanelList>
                  <li>
                    <NavigationMenuLink href="#">Docs</NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink href="#">CLI</NavigationMenuLink>
                  </li>
                </NavigationMenuPanelList>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#" active>
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </header>
      <div className="flex">
        <aside className="hidden w-60 border-r border-border p-3 md:block">
          <SidebarLinks />
        </aside>
        <main className="flex-1 p-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbEllipsis />
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="#">Workspace</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-4 font-display text-2xl font-semibold">Overview</h1>
        </main>
      </div>
    </div>
  ),
};

const sides: SheetSide[] = ["left", "right", "top", "bottom"];

export const SheetSides: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <div className="flex gap-2">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">{side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Sheet — {side}</SheetTitle>
              <SheetDescription>Slides in from the {side} edge.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};

const sizes: DialogSize[] = ["sm", "md", "lg", "xl", "full"];

export const ModalSizes: Story = {
  parameters: { layout: "centered" },
  render: () => (
    <div className="flex gap-2">
      {sizes.map((size) => (
        <Dialog key={size}>
          <DialogTrigger asChild>
            <Button variant="outline">{size}</Button>
          </DialogTrigger>
          <DialogContent size={size}>
            <DialogHeader>
              <DialogTitle>Modal — {size}</DialogTitle>
              <DialogDescription>Dialog with size="{size}".</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  ),
};
