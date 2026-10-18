"use client";

import { Button, Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@altr/apolyx";

const sides = ["top", "right", "bottom", "left"] as const;

export default function PopoverPlacementDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 py-8">
      {sides.map((side) => (
        <Popover key={side}>
          <PopoverTrigger asChild>
            <Button variant="outline">{side}</Button>
          </PopoverTrigger>
          <PopoverContent side={side}>
            <PopoverTitle>Side {side}</PopoverTitle>
            <PopoverDescription className="mt-1">
              Preferred side; flips when the viewport is tight.
            </PopoverDescription>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
