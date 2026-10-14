"use client";

import * as React from "react";
import { ArrowUp, AtSign, Bold, ChevronDown, Italic, Paperclip, Plus, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea,
  toast,
} from "@altr/apolyx";

const models = ["Swift", "Balanced", "Deep"];

function CommentBox() {
  return (
    <InputGroup>
      <InputGroupTextarea placeholder="Leave a comment…" aria-label="Comment" />
      <InputGroupAddon align="block-end" divided className="justify-between py-1.5">
        <span className="flex items-center gap-0.5">
          <InputGroupButton size="icon-xs" aria-label="Bold">
            <Bold />
          </InputGroupButton>
          <InputGroupButton size="icon-xs" aria-label="Italic">
            <Italic />
          </InputGroupButton>
          <InputGroupButton size="icon-xs" aria-label="Mention">
            <AtSign />
          </InputGroupButton>
        </span>
        <span className="flex items-center gap-1.5">
          <InputGroupButton>Cancel</InputGroupButton>
          <InputGroupButton variant="default" onClick={() => toast.success("Comment posted")}>
            Comment
          </InputGroupButton>
        </span>
      </InputGroupAddon>
    </InputGroup>
  );
}

function PromptComposer() {
  const [model, setModel] = React.useState("Balanced");
  return (
    <InputGroup className="rounded-xl">
      <InputGroupTextarea placeholder="Ask Apolyx to build something…" aria-label="Prompt" />
      <InputGroupAddon align="block-end" className="justify-between pb-2">
        <span className="flex items-center gap-1">
          <InputGroupButton size="icon-xs" variant="outline" aria-label="Attach">
            <Paperclip />
          </InputGroupButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <InputGroupButton aria-label={`Model: ${model}`}>
                <Sparkles /> {model} <ChevronDown />
              </InputGroupButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
                {models.map((m) => (
                  <DropdownMenuRadioItem key={m} value={m}>
                    {m}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
        <InputGroupButton size="icon-xs" variant="default" className="rounded-full" aria-label="Send">
          <ArrowUp />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

function PillPrompt() {
  return (
    <InputGroup shape="pill" size="lg">
      <InputGroupAddon>
        <InputGroupButton size="icon-xs" className="rounded-full" aria-label="Add">
          <Plus />
        </InputGroupButton>
      </InputGroupAddon>
      <InputGroupInput placeholder="Message Apolyx" aria-label="Message" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" variant="default" className="rounded-full" aria-label="Send">
          <ArrowUp />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export default function InputGroupComposerDemo() {
  return (
    <div className="grid w-full max-w-md gap-4">
      <CommentBox />
      <PromptComposer />
      <PillPrompt />
    </div>
  );
}
