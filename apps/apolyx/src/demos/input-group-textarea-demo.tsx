"use client";

import * as React from "react";
import { FileCode } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@altr/apolyx";

const LIMIT = 280;

export default function InputGroupTextareaDemo() {
  const [text, setText] = React.useState("");
  const over = text.length > LIMIT;
  return (
    <div className="grid w-full max-w-md gap-3">
      <InputGroup>
        <InputGroupAddon align="block-start" divided className="justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs">
            <FileCode /> script.ts
          </span>
          <InputGroupText className="text-xs">TypeScript</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea
          aria-label="Script"
          className="font-mono text-xs"
          defaultValue={'export const greet = (name: string) =>\n  `Hello, ${name}`;'}
        />
      </InputGroup>
      <InputGroup>
        <InputGroupTextarea
          aria-label="Post"
          placeholder="What's new?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={over || undefined}
        />
        <InputGroupAddon align="block-end" className="justify-end">
          <InputGroupText
            className={over ? "text-xs font-medium text-destructive" : "text-xs tabular-nums"}
            aria-live={text.length > LIMIT * 0.9 ? "polite" : "off"}
          >
            {LIMIT - text.length} left
          </InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
