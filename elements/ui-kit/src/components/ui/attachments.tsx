"use client";

import * as React from "react";
import { File, ImageIcon, Paperclip, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type AttachmentItem = {
  id: string;
  name: string;
  size?: string;
  kind?: "file" | "image";
};

export type AttachmentsProps = {
  items?: AttachmentItem[];
  onRemove?: (id: string) => void;
  className?: string;
};

const DEMO: AttachmentItem[] = [
  { id: "1", name: "brief.pdf", size: "240 KB", kind: "file" },
  { id: "2", name: "mock.png", size: "1.1 MB", kind: "image" },
];

/** Composer attachment chips. */
export function Attachments({
  items: itemsProp,
  onRemove,
  className,
}: AttachmentsProps) {
  const reduce = useReducedMotion();
  const [items, setItems] = React.useState(itemsProp ?? DEMO);

  React.useEffect(() => {
    if (itemsProp) setItems(itemsProp);
  }, [itemsProp]);

  function remove(id: string) {
    if (itemsProp === undefined) setItems((prev) => prev.filter((i) => i.id !== id));
    onRemove?.(id);
  }

  if (items.length === 0) return null;

  return (
    <ul
      data-slot="attachments"
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.92 }}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-card pl-2 pr-1 text-xs shadow-xs"
          >
            <span className="text-muted-foreground" aria-hidden>
              {item.kind === "image" ? (
                <ImageIcon className="size-3.5" />
              ) : (
                <File className="size-3.5" />
              )}
            </span>
            <span className="max-w-[10rem] truncate font-medium">{item.name}</span>
            {item.size && (
              <span className="text-muted-foreground tabular-nums">{item.size}</span>
            )}
            <button
              type="button"
              aria-label={`Remove ${item.name}`}
              onClick={() => remove(item.id)}
              className="grid size-6 place-items-center rounded-full text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3" aria-hidden />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
      <li className="sr-only">
        <Paperclip />
      </li>
    </ul>
  );
}
