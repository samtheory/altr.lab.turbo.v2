import type { Meta, StoryObj } from "@storybook/react-vite";

import { Dropzone } from "./dropzone";

const meta = {
  title: "UI/Dropzone",
  component: Dropzone,
  tags: ["autodocs"],
} satisfies Meta<typeof Dropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Demo: Story = {
  args: {
    demo: true,
    hint: "PDF, PNG, JPG · up to 25 MB each",
  },
};

export const SingleFile: Story = {
  args: {
    multiple: false,
    files: [],
  },
};
