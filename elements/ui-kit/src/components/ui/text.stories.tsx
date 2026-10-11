import type { Meta, StoryObj } from "@storybook/react-vite";

import { Heading, Text } from "./text";

const meta = {
  title: "UI/Text",
  component: Text,
  tags: ["autodocs"],
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {
  render: () => (
    <div className="space-y-2">
      <Heading as="h2" size="lg">
        Heading
      </Heading>
      <Text>Default body</Text>
      <Text tone="muted" size="sm">
        Muted supporting copy
      </Text>
    </div>
  ),
};
