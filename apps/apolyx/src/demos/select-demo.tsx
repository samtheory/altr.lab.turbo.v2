"use client";

import {
  Field,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@altr/apolyx";

export default function SelectDemo() {
  return (
    <Field label="Bucket" description="Jord records namespace." className="max-w-xs">
      <Select defaultValue="lab">
        <SelectTrigger>
          <SelectValue placeholder="Pick a bucket" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Apps</SelectLabel>
            <SelectItem value="lab">lab</SelectItem>
            <SelectItem value="artemis">artemis</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Infra</SelectLabel>
            <SelectItem value="jord">jord</SelectItem>
            <SelectItem value="tia" disabled>
              tia (soon)
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
