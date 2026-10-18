"use client";

import { Settings2 } from "lucide-react";
import {
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Label,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  Button,
} from "@altr/apolyx";

export default function InputGroupPopoverDemo() {
  return (
    <InputGroup className="max-w-sm">
      <InputGroupInput placeholder="Layer name" aria-label="Layer name" />
      <InputGroupAddon align="inline-end">
        <Popover>
          <PopoverTrigger asChild>
            <InputGroupButton aria-label="Dimensions">
              <Settings2 />
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription className="mt-1">
              Adjust width and height without leaving the field.
            </PopoverDescription>
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="ig-width">Width</Label>
                <Input id="ig-width" defaultValue="100%" className="col-span-2 h-8" />
              </div>
              <div className="grid grid-cols-3 items-center gap-2">
                <Label htmlFor="ig-height">Height</Label>
                <Input id="ig-height" defaultValue="24px" className="col-span-2 h-8" />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <PopoverClose asChild>
                <Button size="sm">Apply</Button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      </InputGroupAddon>
    </InputGroup>
  );
}
