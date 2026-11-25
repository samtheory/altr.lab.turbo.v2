"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

const SLOTS = [
  {
    className:
      "z-10 h-24 w-32 -translate-x-[62%] rotate-[-4deg] group-hover:-translate-x-[86%] group-hover:-translate-y-16 group-hover:rotate-[-14deg]",
    delay: "group-hover:delay-75",
  },
  {
    className:
      "z-10 h-24 w-32 -translate-x-[38%] rotate-[4deg] group-hover:-translate-x-[14%] group-hover:-translate-y-14 group-hover:rotate-[12deg]",
    delay: "group-hover:delay-100",
  },
  {
    className:
      "z-20 h-28 w-[5.25rem] rounded-md -translate-x-1/2 translate-y-4 group-hover:-translate-y-[3.75rem] group-hover:-rotate-2",
    delay: "group-hover:delay-0",
  },
];

export type FolderCardProps = {
  sheets?: React.ReactNode[];
  className?: string;
};

function Moodboard() {
  return (
    <div className="grid size-full grid-cols-3 grid-rows-2 gap-1 bg-warning/20 p-1.5">
      <div className="col-span-2 row-span-2 flex items-end rounded bg-gradient-to-br from-warning to-destructive p-1.5">
        <div className="size-5 rounded-full bg-warning-foreground/80" />
      </div>
      <div className="rounded bg-info" />
      <div className="rounded bg-success" />
    </div>
  );
}

function Analytics() {
  return (
    <div className="flex size-full flex-col gap-1.5 bg-muted p-2">
      <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      <div className="flex flex-1 items-end gap-1">
        {[40, 65, 50, 85, 70, 95].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-success/80" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function DocumentFile() {
  return (
    <div className="relative flex size-full flex-col gap-1.5 bg-card p-2.5 pt-3 [clip-path:polygon(0_0,calc(100%-1.25rem)_0,100%_1.25rem,100%_100%,0_100%)]">
      <div className="absolute top-0 right-0 size-5 rounded-bl-md bg-muted shadow-sm" />
      <div className="mb-0.5 h-1.5 w-9 rounded-full bg-primary" />
      <div className="h-1 w-full rounded-full bg-muted" />
      <div className="h-1 w-full rounded-full bg-muted" />
      <div className="h-1 w-10 rounded-full bg-muted" />
      <div className="mt-auto self-start rounded bg-primary/10 px-1 py-0.5 text-[7px] font-semibold leading-none text-primary">
        PDF
      </div>
    </div>
  );
}

/** Folder that opens on hover and fans out up to three sheets. */
export function FolderCard({
  sheets = [<Moodboard key="m" />, <Analytics key="a" />, <DocumentFile key="d" />],
  className,
}: FolderCardProps) {
  return (
    <div className={cn("group w-full max-w-xs", className)} data-slot="folder-card">
      <div aria-hidden className="relative flex h-[17rem] items-end justify-center pb-6">
        <div className="relative h-44 w-52 [perspective:700px]">
          <div className="absolute top-0 left-0 h-7 w-20 rounded-t-xl bg-muted-foreground/35 [clip-path:polygon(0_0,72%_0,100%_100%,0_100%)]" />
          <div className="absolute inset-x-0 top-5 bottom-0 rounded-2xl rounded-tl-none bg-gradient-to-b from-muted-foreground/35 to-muted-foreground/20" />

          {sheets.slice(0, SLOTS.length).map((content, i) => (
            <div
              key={i}
              className={cn(
                "absolute bottom-14 left-1/2 overflow-hidden rounded-lg shadow-md ring-1 ring-border",
                "transition-transform duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] motion-reduce:transition-none",
                SLOTS[i]!.className,
                SLOTS[i]!.delay,
              )}
            >
              {content}
            </div>
          ))}

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-30 h-[74%] origin-bottom rounded-2xl",
              "bg-gradient-to-b from-card/90 to-muted/90 shadow-lg backdrop-blur-md",
              "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:[transform:rotateX(-38deg)] motion-reduce:transition-none",
            )}
          >
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
