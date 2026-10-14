import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowUp, Copy, Mail, Paperclip, Search } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "./input-group";
import { Spinner } from "./spinner";

const meta = {
  title: "UI/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Addons: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      <InputGroup>
        <InputGroupAddon>
          <Mail />
        </InputGroupAddon>
        <InputGroupInput placeholder="Email" aria-label="Email" />
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput placeholder="apolyx.dev" aria-label="Website" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>.com</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const Actions: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      <InputGroup>
        <InputGroupInput readOnly value="sk_live_8f2c" aria-label="Key" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Copy">
            <Copy />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="you@apolyx.dev" aria-label="Email" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="secondary">Subscribe</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};

export const Status: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput defaultValue="button" aria-label="Search" />
        <InputGroupAddon align="inline-end">
          <Spinner label="Searching" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput defaultValue="bad@" aria-invalid aria-label="Email" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput defaultValue="locked" disabled aria-label="Locked" />
      </InputGroup>
    </div>
  ),
};

export const Composer: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupTextarea placeholder="Ask anything…" aria-label="Prompt" />
      <InputGroupAddon align="block-end" className="justify-between pb-2">
        <InputGroupButton size="icon-xs" variant="outline" aria-label="Attach">
          <Paperclip />
        </InputGroupButton>
        <InputGroupButton size="icon-xs" variant="default" aria-label="Send">
          <ArrowUp />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
