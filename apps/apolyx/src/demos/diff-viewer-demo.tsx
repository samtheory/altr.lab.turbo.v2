"use client";

import { DiffViewer } from "@altr/apolyx";

const LINES = [
  { type: "context" as const, text: "export function greet(name: string) {", oldNo: 1, newNo: 1 },
  { type: "remove" as const, text: '  return "Hi " + name;', oldNo: 2 },
  { type: "add" as const, text: "  return `Hello, ${name}!`;", newNo: 2 },
  { type: "context" as const, text: "}", oldNo: 3, newNo: 3 },
];

export default function Demo() {
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <DiffViewer title="greet.ts · unified" lines={LINES} mode="unified" />
      <DiffViewer title="greet.ts · split" lines={LINES} mode="split" />
    </div>
  );
}