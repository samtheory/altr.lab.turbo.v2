"use client";

import {
  BookOpen,
  Boxes,
  Home,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  AppSidebar,
  AppSidebarBody,
  AppSidebarBrand,
  AppSidebarFooter,
  AppSidebarGroup,
  AppSidebarHeader,
  AppSidebarItem,
  AppSidebarToggle,
} from "@altr/apolyx";

export default function AppSidebarDemo() {
  return (
    <div className="flex h-72 w-full max-w-lg overflow-hidden rounded-xl border border-border">
      <AppSidebar defaultOpen className="shrink-0">
        <AppSidebarHeader>
          <AppSidebarBrand icon={<Sparkles className="size-4" />}>Apolyx</AppSidebarBrand>
          <AppSidebarToggle />
        </AppSidebarHeader>
        <AppSidebarBody>
          <AppSidebarGroup label="Workspace">
            <AppSidebarItem href="#home" icon={<Home />} active>
              Home
            </AppSidebarItem>
            <AppSidebarItem href="#components" icon={<Boxes />}>
              Components
            </AppSidebarItem>
            <AppSidebarItem href="#docs" icon={<BookOpen />}>
              Docs
            </AppSidebarItem>
          </AppSidebarGroup>
        </AppSidebarBody>
        <AppSidebarFooter>
          <AppSidebarItem href="#settings" icon={<Settings />}>
            Settings
          </AppSidebarItem>
        </AppSidebarFooter>
      </AppSidebar>
      <div className="flex flex-1 items-center justify-center bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        Toggle the rail or press Ctrl/⌘+B
      </div>
    </div>
  );
}
