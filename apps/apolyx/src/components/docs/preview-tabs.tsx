"use client";

import * as React from "react";
import { cn, Tabs, TabsContent, TabsList, TabsTrigger } from "@altr/apolyx";

import { CopyButton } from "./copy-button";

export function PreviewTabs({
  code,
  html,
  align = "center",
  children,
}: {
  code: string;
  html: string;
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="preview" className="not-prose my-6">
      <TabsList aria-label="Example view">
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
      <TabsContent value="preview">
        <div
          className={cn(
            "flex min-h-56 flex-wrap gap-4 rounded-xl border border-border bg-background p-8",
            align === "center" ? "items-center justify-center" : "items-start justify-start",
          )}
        >
          {children}
        </div>
      </TabsContent>
      <TabsContent value="code">
        <div className="relative">
          <CopyButton value={code} className="absolute right-2 top-2 z-10" />
          <div
            className="code-block max-h-[480px] overflow-auto rounded-xl border border-border text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
