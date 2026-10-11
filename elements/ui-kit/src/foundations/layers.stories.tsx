import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Toaster, toast } from "../components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

function NestedLayers() {
  return (
    <TooltipProvider delayDuration={200}>
      <Toaster />
      <Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button>Open dialog</Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Opens a modal with a nested menu</TooltipContent>
        </Tooltip>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nested layers</DialogTitle>
            <DialogDescription>
              Escape closes the menu first, then the dialog. Clicking inside the
              dialog closes only the menu.
            </DialogDescription>
          </DialogHeader>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Menu inside dialog</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => toast.success("Duplicated")}>
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.info("Moved")}>
                Move
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.error("Deleted")}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

const meta = {
  title: "Foundations/Layers",
  component: NestedLayers,
  tags: ["autodocs"],
} satisfies Meta<typeof NestedLayers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialogMenuTooltipToast: Story = {};
