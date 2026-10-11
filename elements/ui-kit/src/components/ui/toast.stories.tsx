import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { Toaster, toast } from "./toast";

const meta = {
  title: "UI/Toast",
  component: Toaster,
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      <Toaster {...args} />
      <Button variant="outline" onClick={() => toast("Event created", { description: "Sunday at 10:00" })}>
        Default
      </Button>
      <Button variant="outline" onClick={() => toast.success("Saved")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Upload failed")}>
        Error
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Disk almost full")}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.info("New version available")}>
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((r) => setTimeout(r, 1500)), {
            loading: "Publishing…",
            success: "Published",
            error: "Publish failed",
          })
        }
      >
        Promise
      </Button>
    </div>
  ),
};
