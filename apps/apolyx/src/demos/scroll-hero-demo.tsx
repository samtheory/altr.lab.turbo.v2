"use client";

import { ScrollHero } from "@altr/apolyx";

export default function Demo() {
  return (
    <ScrollHero scrollLength={1.75} className="max-w-3xl">
      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">Scroll the docs page</p>
        <p className="text-sm text-pretty text-muted-foreground">
          The frame scales and tilts as you move through the hero runway. With reduced motion, the frame stays static.
        </p>
        <div className="h-24 rounded-lg bg-muted" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-12 rounded-md bg-accent" />
          <div className="h-12 rounded-md bg-muted" />
          <div className="h-12 rounded-md bg-accent" />
        </div>
      </div>
    </ScrollHero>
  );
}