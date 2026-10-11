import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSkeleton: Story = {
  render: () => (
    <div className="flex w-48 flex-col gap-3">
      <Spinner />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};
