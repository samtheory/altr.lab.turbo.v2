import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Info, Settings2, Star } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";
import {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

const meta = {
  title: "UI/Popover",
  component: Popover,
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
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
            <Label htmlFor="width">Width</Label>
            <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <Label htmlFor="height">Height</Label>
            <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <PopoverClose asChild>
            <Button size="sm">Done</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const Placement: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-wrap items-center justify-center gap-3 p-16">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger asChild>
            <Button variant="outline">{side}</Button>
          </PopoverTrigger>
          <PopoverContent side={side}>
            <PopoverTitle>Side {side}</PopoverTitle>
            <PopoverDescription className="mt-1">
              Flips when the viewport is tight.
            </PopoverDescription>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};

export const Motion: Story = {
  args: { children: null },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">pop</Button>
        </PopoverTrigger>
        <PopoverContent motion="pop">
          <PopoverTitle>Pop</PopoverTitle>
          <PopoverDescription className="mt-1">
            Scale and a short slide from the trigger.
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
            Longer travel along the side.
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
            Opacity only — same as reduced motion.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const Hover: Story = {
  args: { children: null },
  render: () => (
    <Popover trigger="hover">
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="About">
          <Info className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Hover card</PopoverTitle>
        <PopoverDescription className="mt-1">
          Opens after a short delay and stays open while you move into the panel.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  ),
};

export const Anchor: Story = {
  args: { children: null },
  render: () => (
    <Popover>
      <div className="flex items-center gap-2 rounded-lg border border-border p-3">
        <PopoverAnchor className="size-10 rounded-md bg-muted" />
        <div className="flex-1 text-sm">Selected layer</div>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent align="start">
        <PopoverTitle>Layer</PopoverTitle>
        <PopoverDescription className="mt-1">
          Anchored to the swatch, not the button.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  ),
};

export const InsideDialog: Story = {
  args: { children: null },
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Settings</DialogTitle>
        <p className="mt-2 text-sm text-muted-foreground">
          A popover stacked above the dialog. Escape closes the popover first.
        </p>
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
                Nested layer on the same dismiss stack.
              </PopoverDescription>
            </PopoverContent>
          </Popover>
        </div>
      </DialogContent>
    </Dialog>
  ),
};

export const Ratings: Story = {
  args: { children: null },
  render: () => {
    const ratings = { 5: 225, 4: 30, 3: 30, 2: 15, 1: 0 };
    const total = Object.values(ratings).reduce((a, b) => a + b, 0);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Ratings">
            <Star className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex items-center gap-1">
            <span className="text-xl font-semibold">4.55</span>
            <Star className="size-5 fill-warning stroke-warning" />
          </div>
          <p className="mt-1 text-sm font-medium">Total {total} reviews</p>
          <PopoverDescription className="mt-1">
            All reviews are from verified customers.
          </PopoverDescription>
          <div className="mt-3 flex items-center justify-between">
            <Badge variant="secondary">+6 this week</Badge>
            <button type="button" className="text-sm hover:underline">
              See all
            </button>
          </div>
          <ul className="mt-3 space-y-2">
            {Object.entries(ratings).map(([star, count]) => (
              <li key={star} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0">{star} star</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-warning"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-end">{count}</span>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    );
  },
};

export const Controlled: Story = {
  args: { children: null },
  render: function ControlledStory() {
    const [open, setOpen] = useState(false);
    return (
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          Open from outside
        </Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">Controlled</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverTitle>Controlled</PopoverTitle>
            <PopoverDescription className="mt-1">
              Open state lives in the parent.
            </PopoverDescription>
            <div className="mt-3">
              <PopoverClose asChild>
                <Button size="sm">Close</Button>
              </PopoverClose>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
};
