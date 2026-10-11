import type { Meta, StoryObj } from "@storybook/react-vite";

import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Theme/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <Story />
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
