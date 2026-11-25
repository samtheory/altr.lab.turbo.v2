import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderCard } from "./folder-card";

const meta = {
  title: "UI/Folder Card",
  component: FolderCard,
  tags: ["autodocs"],
} satisfies Meta<typeof FolderCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
