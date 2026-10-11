import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Automatic: Story = {
  args: { defaultValue: "overview", children: null },
  render: (args) => (
    <Tabs {...args} className="w-[360px]">
      <TabsList aria-label="Project">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Summary of the project.</TabsContent>
      <TabsContent value="activity">Recent commits and deploys.</TabsContent>
      <TabsContent value="settings">Project configuration.</TabsContent>
    </Tabs>
  ),
};

export const Manual: Story = {
  ...Automatic,
  args: { defaultValue: "overview", activationMode: "manual", children: null },
};
