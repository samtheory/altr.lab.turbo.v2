"use client";

import * as React from "react";
import { Palette, Sparkles } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type MoodTile = {
  id: string;
  label: string;
  color: string;
};

export type MoodboardGeneratorProps = {
  palette?: string[];
  prompt?: string;
  defaultPrompt?: string;
  tiles?: MoodTile[];
  onGenerate?: (prompt: string) => void;
  className?: string;
};

const defaultPalette = [
  "var(--primary)",
  "var(--info)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
];

const defaultTiles: MoodTile[] = [
  { id: "1", label: "Soft editorial", color: "color-mix(in oklch, var(--primary) 18%, var(--card))" },
  { id: "2", label: "High contrast", color: "color-mix(in oklch, var(--foreground) 8%, var(--muted))" },
  { id: "3", label: "Warm accent", color: "color-mix(in oklch, var(--warning) 22%, var(--card))" },
  { id: "4", label: "Calm depth", color: "color-mix(in oklch, var(--info) 20%, var(--background))" },
];

/** Moodboard generator mock with palette, prompt, and result tiles. */
export function MoodboardGenerator({
  palette = defaultPalette,
  prompt: promptProp,
  defaultPrompt = "Minimal SaaS with bold typography",
  tiles = defaultTiles,
  onGenerate,
  className,
}: MoodboardGeneratorProps) {
  const reduce = useReducedMotion();
  const [internalPrompt, setInternalPrompt] = React.useState(defaultPrompt);
  const prompt = promptProp ?? internalPrompt;

  function handleGenerate() {
    onGenerate?.(prompt);
  }

  return (
    <div
      data-slot="moodboard-generator"
      className={cn(
        "w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <header className="mb-5 flex items-center gap-2">
        <Palette className="size-5 text-primary" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold">Moodboard generator</h3>
          <p className="text-xs text-muted-foreground">Palette + prompt → tiles</p>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-2" role="list" aria-label="Palette">
        {palette.map((color) => (
          <span
            key={color}
            role="listitem"
            className="size-8 rounded-full border border-border shadow-inner"
            style={{ background: color }}
          />
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {promptProp === undefined ? (
          <Input
            value={internalPrompt}
            onChange={(e) => setInternalPrompt(e.target.value)}
            placeholder="Describe the mood…"
            aria-label="Mood prompt"
          />
        ) : (
          <p className="flex h-10 flex-1 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
            {prompt}
          </p>
        )}
        <Button type="button" onClick={handleGenerate} className="shrink-0">
          <Sparkles className="size-4" aria-hidden />
          Generate
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {tiles.map((tile, i) => (
          <motion.li
            key={tile.id}
            className="overflow-hidden rounded-xl border border-border"
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
          >
            <div className="h-20 w-full" style={{ background: tile.color }} aria-hidden />
            <p className="px-3 py-2 text-xs font-medium">{tile.label}</p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}