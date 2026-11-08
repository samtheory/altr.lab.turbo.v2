"use client";

import { Github, Star } from "lucide-react";
import { ButtonGroup, ButtonGroupAddon, ButtonGroupItem, ButtonGroupSeparator } from "@altr/apolyx";

export default function ButtonGroupDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <ButtonGroup aria-label="Star repository">
        <ButtonGroupItem>
          <Star aria-hidden />
          Star
        </ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupAddon>
          <Github aria-hidden />
          15K
        </ButtonGroupAddon>
      </ButtonGroup>
      <ButtonGroup variant="default" aria-label="Publish">
        <ButtonGroupItem>Publish</ButtonGroupItem>
        <ButtonGroupSeparator />
        <ButtonGroupAddon>Live</ButtonGroupAddon>
      </ButtonGroup>
      <ButtonGroup aria-label="Range">
        <ButtonGroupItem>Day</ButtonGroupItem>
        <ButtonGroupItem>Week</ButtonGroupItem>
        <ButtonGroupItem>Month</ButtonGroupItem>
      </ButtonGroup>
    </div>
  );
}
