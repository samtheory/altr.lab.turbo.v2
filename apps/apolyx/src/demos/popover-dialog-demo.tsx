"use client";

import { Settings2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@altr/apolyx";

export default function PopoverDialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Project settings</DialogTitle>
        <DialogDescription>
          Escape closes the popover first, then the dialog.
        </DialogDescription>
        <div className="mt-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="size-4" />
                Advanced
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <PopoverTitle>Advanced</PopoverTitle>
              <PopoverDescription className="mt-1">
                Nested on the same dismiss stack. Outside click hits this layer only.
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      </DialogContent>
    </Dialog>
  );
}
