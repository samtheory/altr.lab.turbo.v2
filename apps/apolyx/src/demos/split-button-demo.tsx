"use client";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  SplitButton,
  SplitButtonAction,
  SplitButtonMenu,
} from "@altr/apolyx";

export default function SplitButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <SplitButton>
        <SplitButtonAction>Save</SplitButtonAction>
        <SplitButtonMenu>
          <DropdownMenuItem>Save as draft</DropdownMenuItem>
          <DropdownMenuItem>Save and publish</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Discard changes</DropdownMenuItem>
        </SplitButtonMenu>
      </SplitButton>
      <SplitButton variant="default">
        <SplitButtonAction>Deploy</SplitButtonAction>
        <SplitButtonMenu>
          <DropdownMenuItem>Deploy to production</DropdownMenuItem>
          <DropdownMenuItem>View logs</DropdownMenuItem>
        </SplitButtonMenu>
      </SplitButton>
    </div>
  );
}
