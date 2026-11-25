import type { Meta, StoryObj } from "@storybook/react-vite";
import { GlobeArcs } from "./globe-arcs";
const meta = { title: "UI/Globe Arcs", component: GlobeArcs, tags: ["autodocs"] } satisfies Meta<typeof GlobeArcs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
