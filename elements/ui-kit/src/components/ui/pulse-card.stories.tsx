import type { Meta, StoryObj } from "@storybook/react-vite";
import { PulseCard } from "./pulse-card";
const meta = { title: "UI/Pulse Card", component: PulseCard, tags: ["autodocs"] } satisfies Meta<typeof PulseCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
