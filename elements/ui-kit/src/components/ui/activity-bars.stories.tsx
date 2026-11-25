import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActivityBars } from "./activity-bars";
const meta = { title: "UI/Activity Bars", component: ActivityBars, tags: ["autodocs"] } satisfies Meta<typeof ActivityBars>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
