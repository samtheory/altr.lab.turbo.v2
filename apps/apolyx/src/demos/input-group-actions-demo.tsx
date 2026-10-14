"use client";

import { ArrowRight, Info, Mic, Paperclip } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@altr/apolyx";

export default function InputGroupActionsDemo() {
  return (
    <div className="grid w-full max-w-sm gap-3">
      <InputGroup>
        <InputGroupInput type="email" placeholder="you@apolyx.dev" aria-label="Email" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="secondary">Subscribe</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Coupon code" aria-label="Coupon code" />
        <InputGroupAddon align="inline-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <InputGroupButton size="icon-xs" aria-label="Where to find codes">
                <Info />
              </InputGroupButton>
            </TooltipTrigger>
            <TooltipContent>Codes arrive in your welcome email.</TooltipContent>
          </Tooltip>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Ask anything" aria-label="Message" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" aria-label="Attach file">
            <Paperclip />
          </InputGroupButton>
          <InputGroupButton size="icon-xs" aria-label="Dictate">
            <Mic />
          </InputGroupButton>
          <InputGroupButton size="icon-xs" variant="default" aria-label="Send">
            <ArrowRight />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
