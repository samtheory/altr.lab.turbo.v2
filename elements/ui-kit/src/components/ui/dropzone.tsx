"use client";

import * as React from "react";
import { Check, RotateCw, TriangleAlert, Upload, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "../../lib/utils";
import { easings } from "../../motion/tokens";

/** One file in the list. The consumer owns uploads and updates progress / status. */
export type DropzoneFile = {
  id: string;
  name: string;
  /** Size in bytes. */
  size: number;
  status: "uploading" | "done" | "failed" | "rejected";
  /** 0 to 1 while uploading. */
  progress?: number;
  error?: string;
};

export type DropzoneProps = {
  files?: DropzoneFile[];
  onFiles?: (accepted: File[], rejected: File[]) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onClear?: () => void;
  accept?: string;
  maxSizeMB?: number;
  /** Allow picking several files at once. */
  multiple?: boolean;
  hint?: string;
  /** Scripted upload loop for previews / Storybook. */
  demo?: boolean;
  className?: string;
};

type DemoItem = {
  name: string;
  ext: string;
  size: number;
  duration?: number;
  failAt?: number;
  tooLarge?: boolean;
};

const DEMO_FILES: DemoItem[] = [
  { name: "Q3-Board-Report.pdf", ext: "PDF", size: 4.2, duration: 4200 },
  { name: "Hero-Shot.png", ext: "PNG", size: 2.6, duration: 3100 },
  { name: "Budget-2027.xlsx", ext: "XLSX", size: 1.3, duration: 3600, failAt: 0.55 },
  { name: "Product-Demo.mp4", ext: "MP4", size: 48, tooLarge: true },
];

const DRAG = 900;
const DROP = 2000;
const START = 2100;
const CLEAR = 7900;
const LOOP = 9000;
const STEP = 100;
const STILL = 5400;
const ROW = 41;

type Row = DemoItem & {
  id: string;
  status: DropzoneFile["status"];
  progress: number;
  left: number | null;
  error?: string;
};

const extOf = (name: string) =>
  name.includes(".") ? name.split(".").pop()!.slice(0, 4).toUpperCase() : "FILE";
const mb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;

function rowOf(file: DropzoneFile): Row {
  return {
    id: file.id,
    name: file.name,
    ext: extOf(file.name),
    size: mb(file.size),
    status: file.status,
    progress: file.status === "done" ? 1 : (file.progress ?? 0),
    left: null,
    error: file.error,
  };
}

function rowAt(file: DemoItem, t: number): Row {
  const id = file.name;
  if (file.tooLarge) return { ...file, id, status: "rejected", progress: 0, left: 0 };
  const duration = file.duration ?? 1;
  const p = Math.min(1, Math.max(0, (t - START) / duration));
  if (file.failAt !== undefined && p >= file.failAt) {
    return { ...file, id, status: "failed", progress: file.failAt, left: 0 };
  }
  if (p >= 1) return { ...file, id, status: "done", progress: 1, left: 0 };
  return {
    ...file,
    id,
    status: "uploading",
    progress: p,
    left: Math.ceil((duration * (1 - p)) / 1000),
  };
}

function Sheet({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-end justify-center rounded-md border bg-card pb-0.5 text-[6px] font-semibold text-muted-foreground transition-transform duration-300 ease-out",
        className,
      )}
    >
      {label}
    </span>
  );
}

function FileRow({
  row,
  shown,
  index,
  still,
  maxSizeMB,
  onRemove,
  onRetry,
}: {
  row: Row;
  shown: boolean;
  index: number;
  still: boolean;
  maxSizeMB: number;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
}) {
  const error = row.status === "failed" || row.status === "rejected";
  const shake = shown && error && !still;
  const meta =
    row.status === "rejected"
      ? (row.error ?? `Too large – max ${maxSizeMB} MB`)
      : row.status === "failed"
        ? (row.error ?? "Upload failed")
        : row.status === "done"
          ? `${row.size} MB`
          : `${(row.size * row.progress).toFixed(1)} of ${row.size} MB · ${
              row.progress > 0.8
                ? "almost done"
                : row.left !== null
                  ? `${row.left}s left`
                  : `${Math.round(row.progress * 100)}%`
            }`;

  return (
    <li
      className={cn(
        "h-10 transition-[opacity,transform] duration-300 ease-out",
        shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
      )}
      style={{ transitionDelay: shown ? `${index * 60}ms` : "0ms" }}
    >
      <motion.div
        key={shake ? "error" : "ok"}
        className="flex h-full items-center gap-3 px-3"
        animate={shake ? { x: [0, -5, 5, -4, 4, -2, 0] } : undefined}
        transition={{
          duration: 0.45,
          ease: "easeOut",
          delay: row.status === "rejected" ? 0.25 + index * 0.06 : 0,
        }}
      >
        <span className="relative grid h-7 w-6 shrink-0 place-items-end justify-center rounded-[3px] border bg-background pb-0.5">
          <span className="rounded-[2px] bg-secondary px-0.5 text-[6px] leading-tight font-semibold text-muted-foreground">
            {row.ext}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-xs leading-4 font-medium">
            {row.name}
            <Check
              className={cn(
                "size-3 shrink-0 text-muted-foreground transition-[opacity,transform] duration-300",
                row.status === "done" ? "scale-100 opacity-100" : "scale-50 opacity-0",
              )}
            />
          </p>
          <p
            className={cn(
              "truncate text-[10px] leading-3.5 tabular-nums",
              error ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {meta}
          </p>
          <div
            role="progressbar"
            aria-label={row.name}
            aria-valuenow={Math.round(row.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn(
              "mt-1 h-0.5 overflow-hidden rounded-full bg-secondary transition-opacity duration-500",
              row.status === "rejected" || row.status === "done" ? "opacity-0" : "opacity-100",
            )}
          >
            <div
              className={cn(
                "h-full origin-left rounded-full transition-transform duration-100 ease-linear",
                row.status === "failed" ? "bg-destructive" : "bg-primary",
              )}
              style={{ transform: `scaleX(${row.progress})` }}
            />
          </div>
        </div>
        <button
          type="button"
          aria-label={`Retry ${row.name}`}
          tabIndex={row.status === "failed" ? 0 : -1}
          onClick={() => onRetry?.(row.id)}
          className={cn(
            "shrink-0 text-muted-foreground transition-opacity duration-300 hover:text-foreground",
            row.status === "failed" ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <RotateCw className="size-3" />
        </button>
        <button
          type="button"
          aria-label={`Remove ${row.name}`}
          onClick={() => onRemove?.(row.id)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </motion.div>
    </li>
  );
}

/** Drag-and-drop upload surface with a growing file list, progress, retry, and size rejection. */
export function Dropzone({
  files = [],
  onFiles,
  onRemove,
  onRetry,
  onClear,
  accept,
  maxSizeMB = 25,
  multiple = true,
  hint,
  demo = false,
  className,
}: DropzoneProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [over, setOver] = React.useState(0);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    const all = [...list];
    const limit = maxSizeMB * 1024 * 1024;
    const capped = multiple ? all : all.slice(0, 1);
    onFiles?.(
      capped.filter((f) => f.size <= limit),
      capped.filter((f) => f.size > limit),
    );
  };

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!demo || !visible || reduce) return;
    const id = window.setInterval(() => setTick((t) => (t + STEP) % LOOP), STEP);
    return () => window.clearInterval(id);
  }, [demo, visible, reduce]);

  const t = reduce ? STILL : tick;
  const rows = demo ? DEMO_FILES.map((f) => rowAt(f, t)) : files.map(rowOf);
  const dragging = demo ? t >= DRAG && t < DROP : over > 0;
  const listed = demo ? t >= DROP && t < CLEAR : rows.length > 0;
  const active = rows.filter((r) => r.status === "uploading");
  const settled = listed && active.length === 0;
  const done = rows.filter((r) => r.status === "done").length;
  const loaded = active.reduce((sum, r) => sum + r.size * r.progress, 0);
  const total = active.reduce((sum, r) => sum + r.size, 0);

  return (
    <div
      ref={ref}
      data-slot="dropzone"
      className={cn("w-full max-w-sm rounded-xl bg-secondary p-1 text-foreground", className)}
    >
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div
          role="button"
          tabIndex={demo ? -1 : 0}
          aria-label={multiple ? "Upload files" : "Upload a file"}
          onClick={() => !demo && input.current?.click()}
          onKeyDown={(e) => {
            if (!demo && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              input.current?.click();
            }
          }}
          onDragEnter={(e) => {
            if (demo) return;
            e.preventDefault();
            setOver((n) => n + 1);
          }}
          onDragOver={(e) => !demo && e.preventDefault()}
          onDragLeave={() => !demo && setOver((n) => Math.max(0, n - 1))}
          onDrop={(e) => {
            if (demo) return;
            e.preventDefault();
            setOver(0);
            take(e.dataTransfer.files);
          }}
          className={cn(
            "m-1 flex cursor-pointer flex-col items-center rounded-md border border-dashed px-3 pt-2 pb-1.5 outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring/50",
            dragging ? "border-primary/60 bg-accent" : "bg-secondary/40",
          )}
        >
          <input
            ref={input}
            type="file"
            hidden
            accept={accept}
            multiple={multiple}
            onChange={(e) => {
              take(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="relative grid size-6 place-items-center">
            <Sheet label="PDF" className={dragging ? "-translate-x-2.5 -rotate-12" : "-translate-x-0.5 -rotate-6"} />
            <Sheet label="PNG" className={dragging ? "translate-x-2.5 rotate-12" : "translate-x-0.5 rotate-6"} />
            <span
              className={cn(
                "relative grid size-6 place-items-center rounded-md border bg-card shadow-xs transition-transform duration-300",
                dragging && "-translate-y-0.5",
              )}
            >
              <Upload className="size-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xs font-medium">
            {dragging ? (
              "Release to upload"
            ) : (
              <>
                Drop {multiple ? "files" : "a file"} here or{" "}
                <span className="underline underline-offset-2">browse</span>
              </>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hint ?? `Up to ${maxSizeMB} MB each`}
          </p>
        </div>

        <div
          className="overflow-hidden transition-[height] duration-500"
          style={{
            height: listed ? rows.length * ROW : 0,
            transitionTimingFunction: `cubic-bezier(${easings.out.join(",")})`,
          }}
        >
          <ul className="divide-y border-t">
            {rows.map((row, i) => (
              <FileRow
                key={row.id}
                row={row}
                shown={listed}
                index={i}
                still={!!reduce}
                maxSizeMB={maxSizeMB}
                onRemove={demo ? undefined : onRemove}
                onRetry={demo ? undefined : onRetry}
              />
            ))}
          </ul>
        </div>
      </div>

      <div className="relative h-6 px-2 text-[11px] text-muted-foreground">
        <span
          className={cn(
            "absolute inset-x-2 top-1/2 -translate-y-1/2 transition-opacity duration-300",
            listed ? "opacity-0" : "opacity-100",
          )}
        >
          No files yet
        </span>
        <span
          className={cn(
            "absolute inset-x-2 top-1/2 -translate-y-1/2 tabular-nums transition-opacity duration-300",
            listed && !settled ? "opacity-100" : "opacity-0",
          )}
        >
          Uploading {active.length} of {rows.length} · {loaded.toFixed(1)} of {total.toFixed(1)} MB
        </span>
        <span
          className={cn(
            "absolute inset-x-2 top-1/2 flex -translate-y-1/2 items-center justify-between transition-opacity duration-300",
            settled ? "opacity-100" : "opacity-0",
          )}
        >
          <span className="flex items-center gap-1">
            <TriangleAlert className="size-3" />
            {done} of {rows.length} uploaded
          </span>
          <button
            type="button"
            onClick={demo ? undefined : onClear}
            className="font-medium text-foreground hover:underline"
          >
            Clear
          </button>
        </span>
      </div>
    </div>
  );
}
