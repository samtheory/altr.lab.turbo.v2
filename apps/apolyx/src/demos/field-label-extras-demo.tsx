"use client";

import { Info } from "lucide-react";
import {
  Badge,
  Field,
  FieldInput,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@altr/apolyx";

export default function FieldLabelExtrasDemo() {
  return (
    <div className="grid w-full max-w-sm gap-5">
      <Field
        label="Password"
        labelAside={
          <a href="#reset" className="font-medium text-primary underline-offset-4 hover:underline">
            Forgot password?
          </a>
        }
      >
        <FieldInput type="password" autoComplete="current-password" />
      </Field>
      <Field
        label="API key"
        labelAside={
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="About API keys"
                className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Info className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Create keys under Settings → Developers.</TooltipContent>
          </Tooltip>
        }
      >
        <FieldInput placeholder="sk_live_…" className="font-mono" />
      </Field>
      <Field
        label="Webhook URL"
        labelAside={
          <Badge variant="info" className="px-1.5 py-0 text-[10px]">
            Beta
          </Badge>
        }
      >
        <FieldInput type="url" placeholder="https://" />
      </Field>
      <Field label="Nickname" optional>
        <FieldInput placeholder="What should we call you?" />
      </Field>
    </div>
  );
}
