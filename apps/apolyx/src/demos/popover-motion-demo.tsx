"use client";

import { Button, Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@altr/apolyx";

export default function PopoverMotionDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">pop</Button>
        </PopoverTrigger>
        <PopoverContent motion="pop">
          <PopoverTitle>Pop</PopoverTitle>
          <PopoverDescription className="mt-1">
            Default. Grows from the trigger with a short slide.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">slide left</Button>
        </PopoverTrigger>
        <PopoverContent motion="slide" side="left">
          <PopoverTitle>Slide</PopoverTitle>
          <PopoverDescription className="mt-1">
            Longer travel along the resolved side.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">slide bottom</Button>
        </PopoverTrigger>
        <PopoverContent motion="slide" side="bottom">
          <PopoverTitle>Slide</PopoverTitle>
          <PopoverDescription className="mt-1">
            Same mode, different side.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">fade</Button>
        </PopoverTrigger>
        <PopoverContent motion="fade">
          <PopoverTitle>Fade</PopoverTitle>
          <PopoverDescription className="mt-1">
            Opacity only — also what reduced motion uses.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
    </div>
  );
}
