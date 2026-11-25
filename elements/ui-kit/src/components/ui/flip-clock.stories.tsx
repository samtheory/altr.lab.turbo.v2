import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlipClock } from "./flip-clock";
const meta = { title: "UI/Flip Clock", component: FlipClock, tags: ["autodocs"] } satisfies Meta<typeof FlipClock>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
