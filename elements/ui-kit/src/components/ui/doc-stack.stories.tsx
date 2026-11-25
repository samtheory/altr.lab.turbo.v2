import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocStack } from "./doc-stack";
const meta = { title: "UI/Doc Stack", component: DocStack, tags: ["autodocs"] } satisfies Meta<typeof DocStack>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
