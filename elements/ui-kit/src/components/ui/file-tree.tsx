"use client";

import * as React from "react";
import { ChevronRight, File, Folder } from "lucide-react";

import { cn } from "../../lib/utils";

export type FileTreeNode = { name: string; children?: FileTreeNode[] };
export type FileTreeProps = { items: FileTreeNode[]; className?: string };

function Node({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {
  const [open, setOpen] = React.useState(depth === 0);
  const hasKids = Boolean(node.children?.length);

  return (
    <li className="list-none">
      <button
        type="button"
        className="flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted/60"
        style={{ paddingLeft: depth * 12 }}
        onClick={() => hasKids && setOpen((v) => !v)}
      >
        {hasKids ? (
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        ) : (
          <span className="size-3.5" />
        )}
        {hasKids ? (
          <Folder className="size-3.5 text-muted-foreground" />
        ) : (
          <File className="size-3.5 text-muted-foreground" />
        )}
        <span>{node.name}</span>
      </button>
      {hasKids && open ? (
        <ul>{node.children!.map((c) => <Node key={c.name} node={c} depth={depth + 1} />)}</ul>
      ) : null}
    </li>
  );
}

export function FileTree({ items, className }: FileTreeProps) {
  return (
    <ul data-slot="file-tree" className={cn("rounded-lg border border-border bg-card p-2", className)}>
      {items.map((n) => (
        <Node key={n.name} node={n} />
      ))}
    </ul>
  );
}