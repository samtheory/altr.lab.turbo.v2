"use client";

import { Button, Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger, Input, Label } from "@altr/apolyx";

export default function PopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Dimensions</PopoverTitle>
        <PopoverDescription className="mt-1">
          Set the size of the layer.
        </PopoverDescription>
        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-3 items-center gap-2">
            <Label htmlFor="demo-width">Width</Label>
            <Input id="demo-width" defaultValue="100%" className="col-span-2 h-8" />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <Label htmlFor="demo-height">Height</Label>
            <Input id="demo-height" defaultValue="25px" className="col-span-2 h-8" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <PopoverClose asChild>
            <Button size="sm">Done</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}
