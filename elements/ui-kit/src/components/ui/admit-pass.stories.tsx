import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdmitPass } from "./admit-pass";
const meta = { title: "UI/Admit Pass", component: AdmitPass, tags: ["autodocs"] } satisfies Meta<typeof AdmitPass>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
