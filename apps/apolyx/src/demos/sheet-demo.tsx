"use client";

import {
  Button,
  NavList,
  NavListGroup,
  NavListItem,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from "@altr/apolyx";
import { BarChart3, Home, Settings } from "lucide-react";

const sides: SheetSide[] = ["left", "right", "top", "bottom"];

export default function SheetDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline" className="capitalize">
              {side}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>Workspace</SheetTitle>
              <SheetDescription>Sheet sliding in from the {side}.</SheetDescription>
            </SheetHeader>
            <NavList>
              <NavListGroup label="Navigate">
                <NavListItem href="#" active>
                  <Home /> Overview
                </NavListItem>
                <NavListItem href="#">
                  <BarChart3 /> Analytics
                </NavListItem>
                <NavListItem href="#">
                  <Settings /> Settings
                </NavListItem>
              </NavListGroup>
            </NavList>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}
