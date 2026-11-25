"use client";

import * as React from "react";
import { Check, Copy, RotateCcw, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type TextPartLike = { type: string; text: string; state?: "streaming" | "done" };

export type StreamingMessageProps = {
  text?: string;
  streaming?: boolean;
  part?: TextPartLike;
  onStop?: () => void;
  onRegenerate?: () => void;
  autoPlay?: boolean;
  className?: string;
};

const DEMO = `Here's a debounced value hook for your agent's search box. It waits **300 ms** after the last keystroke, so the model only sees finished queries.

\`\`\`tsx
export function useDebounce<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}
\`\`\`

- Send the debounced value to the chat hook, not the raw input
- Keep the input itself controlled so typing never lags`;

const START = 500;
const CHAR_MS = 7;
const HOLD = 3600;
const TICK = 40;

type Block =
  | { kind: "p"; text: string; at: number }
  | { kind: "ul"; items: { text: string; at: number }[] }
  | { kind: "code"; lang: string; code: string; at: number; open: boolean };

/** Split markdown-ish text into blocks. An unclosed fence stays a code block. */
export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.split("\n");
  let offset = 0;
  let para: { text: string; at: number } | null = null;
  let list: { text: string; at: number }[] | null = null;
  const flush = () => {
    if (para) blocks.push({ kind: "p", ...para });
    if (list) blocks.push({ kind: "ul", items: list });
    para = null;
    list = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineAt = offset;
    offset += line.length + 1;

    const fence = line.match(/^```(\w*)/);
    if (fence) {
      flush();
      const lang = fence[1] ?? "";
      const start = offset;
      let j = i + 1;
      const body: string[] = [];
      while (j < lines.length && !lines[j]!.startsWith("```")) {
        body.push(lines[j]!);
        offset += lines[j]!.length + 1;
        j++;
      }
      const open = j >= lines.length;
      if (!open) offset += lines[j]!.length + 1;
      blocks.push({ kind: "code", lang, code: body.join("\n"), at: start, open });
      i = j;
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    const item = line.match(/^\s*[-*] (.*)$/);
    if (item) {
      if (para) flush();
      list ??= [];
      list.push({ text: item[1]!, at: lineAt + line.indexOf(item[1]!) });
      continue;
    }
    if (list) flush();
    if (para) para.text += " " + line;
    else para = { text: line, at: lineAt };
  }
  flush();
  return blocks;
}

type Seg = { text: string; at: number; style?: "bold" | "code" };

function inline(text: string, at: number): Seg[] {
  const segs: Seg[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) segs.push({ text: text.slice(last, m.index), at: at + last });
    const inner = m[1] ?? m[2]!;
    segs.push({ text: inner, at: at + m.index + 2, style: m[1] ? "bold" : "code" });
    last = m.index + m[0].length;
  }
  let rest = text.slice(last);
  let restAt = at + last;
  const open = rest.match(/(\*\*|`)([^*`]*)$/);
  if (open && open.index !== undefined) {
    if (open.index > 0) segs.push({ text: rest.slice(0, open.index), at: restAt });
    if (open[2])
      segs.push({
        text: open[2],
        at: restAt + open.index + open[1]!.length,
        style: open[1] === "`" ? "code" : "bold",
      });
    rest = "";
  }
  if (rest) segs.push({ text: rest, at: restAt });
  return segs;
}

function Words({ segs, animate }: { segs: Seg[]; animate: boolean }) {
  return (
    <>
      {segs.map((s) => {
        const parts = s.text.split(/(\s+)/);
        let local = 0;
        const words = parts.map((w) => {
          if (!w) return null;
          const key = s.at + local;
          local += w.length;
          if (!w.trim()) return <React.Fragment key={key}>{w}</React.Fragment>;
          return (
            <span key={key} className={animate ? "apolyx-stream-word" : undefined}>
              {w}
            </span>
          );
        });
        if (s.style === "bold")
          return (
            <strong key={s.at} className="font-semibold">
              {words}
            </strong>
          );
        if (s.style === "code")
          return (
            <code
              key={s.at}
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
            >
              {words}
            </code>
          );
        return <React.Fragment key={s.at}>{words}</React.Fragment>;
      })}
    </>
  );
}

function CopyButton({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
      className={cn(
        "grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {copied ? (
        <Check className="size-3.5" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  );
}

/** Assistant message that streams word-by-word with light markdown. */
export function StreamingMessage({
  text: textProp,
  streaming: streamingProp,
  part,
  onStop,
  onRegenerate,
  autoPlay = false,
  className,
}: StreamingMessageProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  const STREAM_END = START + DEMO.length * CHAR_MS;
  const LOOP = STREAM_END + HOLD;

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !autoPlay) return;
    const io = new IntersectionObserver(([entry]) =>
      setVisible(entry?.isIntersecting ?? false),
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlay]);

  React.useEffect(() => {
    if (!autoPlay || !visible || reduce) return;
    const id = setInterval(() => setTick((t) => (t + TICK) % LOOP), TICK);
    return () => clearInterval(id);
  }, [autoPlay, visible, reduce, LOOP]);

  let text = textProp ?? part?.text ?? DEMO;
  let streaming = streamingProp ?? (part ? part.state === "streaming" : false);
  if (autoPlay) {
    const t = reduce ? LOOP - 1 : tick;
    streaming = t < STREAM_END;
    if (streaming) {
      const chars = Math.max(0, Math.floor((t - START) / CHAR_MS));
      const cut = DEMO.slice(0, chars);
      const space = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
      text = space > 0 ? cut.slice(0, space + 1) : "";
    } else {
      text = DEMO;
    }
  }

  const animate = !reduce;
  const blocks = parseBlocks(text);
  const caret =
    streaming && !reduce ? (
      <span
        aria-hidden
        className="ml-0.5 inline-block h-[1em] w-1.5 translate-y-[0.15em] animate-pulse rounded-sm bg-foreground/70"
      />
    ) : null;
  const lastIndex = blocks.length - 1;
  const showStop = streaming && (onStop || autoPlay);
  const showActions = !streaming && text.length > 0;

  return (
    <div
      ref={ref}
      data-slot="streaming-message"
      className={cn("w-full max-w-lg text-foreground", className)}
    >
      <div className="space-y-3 text-sm leading-relaxed" aria-busy={streaming}>
        {blocks.length === 0 && caret}
        {blocks.map((b, i) => {
          const end = i === lastIndex ? caret : null;
          if (b.kind === "p")
            return (
              <p key={b.at}>
                <Words segs={inline(b.text, b.at)} animate={animate} />
                {end}
              </p>
            );
          if (b.kind === "ul")
            return (
              <ul
                key={b.items[0]!.at}
                className="list-disc space-y-1 pl-5 marker:text-muted-foreground"
              >
                {b.items.map((it, k) => (
                  <li key={it.at}>
                    <Words segs={inline(it.text, it.at)} animate={animate} />
                    {k === b.items.length - 1 && end}
                  </li>
                ))}
              </ul>
            );
          return (
            <div key={b.at} className="overflow-hidden rounded-lg border border-border bg-muted/50">
              <div className="flex items-center justify-between border-b border-border px-3 py-1">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {b.lang || "code"}
                </span>
                {!b.open && <CopyButton text={b.code} label="Copy code" className="size-6" />}
              </div>
              <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-[1.6] [scrollbar-width:thin]">
                <code>
                  <Words segs={[{ text: b.code, at: b.at }]} animate={animate} />
                  {b.open && end}
                </code>
              </pre>
            </div>
          );
        })}
      </div>

      <div className="mt-2 h-7">
        <AnimatePresence mode="wait" initial={false}>
          {showStop ? (
            <motion.button
              key="stop"
              type="button"
              onClick={onStop}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Square className="size-2.5 fill-current" aria-hidden />
              Stop
            </motion.button>
          ) : showActions ? (
            <motion.div
              key="actions"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-0.5"
            >
              <CopyButton text={text} label="Copy message" />
              {(onRegenerate || autoPlay) && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  aria-label="Regenerate"
                  className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
