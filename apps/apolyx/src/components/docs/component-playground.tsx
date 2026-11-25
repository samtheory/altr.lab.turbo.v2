"use client";

import * as React from "react";
import Link from "next/link";
import {
  Code2,
  Copy,
  ExternalLink,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import {
  Button,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Label,
  SplitButton,
  SplitButtonAction,
  SplitButtonMenu,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@altr/apolyx";

import {
  buildCopyPrompt,
  buildMcpSnippet,
  openAiToolUrl,
} from "@/lib/copy-prompt";
import { splitDemoSource } from "@/lib/split-demo-source";
import { getPlayground } from "@/playground/registry";
import type { PlaygroundControl, PlaygroundValues } from "@/playground/types";

import { CopyButton } from "./copy-button";
import { JsxSnippet } from "./jsx-snippet";

type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORTS: {
  id: Viewport;
  label: string;
  width: string;
  icon: typeof Monitor;
}[] = [
  { id: "desktop", label: "Desktop", width: "100%", icon: Monitor },
  { id: "tablet", label: "Tablet", width: "768px", icon: Tablet },
  { id: "mobile", label: "Mobile", width: "390px", icon: Smartphone },
];

export function ComponentPlayground({
  name,
  code,
  html,
  align = "center",
  children,
}: {
  name: string;
  code: string;
  html: string;
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  const schema = getPlayground(name);
  const [viewport, setViewport] = React.useState<Viewport>("desktop");
  const [values, setValues] = React.useState<PlaygroundValues>(() =>
    schema ? { ...schema.defaults } : {},
  );
  const [jsxCopied, setJsxCopied] = React.useState(false);
  const [importCopied, setImportCopied] = React.useState(false);

  const setValue = React.useCallback((key: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const { importLine, body } = React.useMemo(() => splitDemoSource(code), [code]);
  // Pilots: live customized usage. Others: full demo component source (sans import).
  const liveJsx = schema ? schema.toJsx(values) : body;
  const prompt = buildCopyPrompt({
    component: schema?.component ?? name,
    installName: schema?.installName ?? name.replace(/-demo$/, ""),
    docsPath: schema?.docsPath ?? `/docs/components/${name.replace(/-demo$/, "")}`,
    jsx: importLine ? `${importLine}\n\n${liveJsx}` : liveJsx,
    code,
  });

  React.useEffect(() => {
    if (!jsxCopied) return;
    const t = window.setTimeout(() => setJsxCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [jsxCopied]);

  React.useEffect(() => {
    if (!importCopied) return;
    const t = window.setTimeout(() => setImportCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [importCopied]);

  async function copyText(text: string, message: string) {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  }

  async function handleCopyPrompt() {
    await copyText(prompt, "Prompt copied");
  }

  async function handleCopyCode() {
    await copyText(code, "Code copied");
  }

  async function handleCopyImport() {
    if (!importLine) return;
    await copyText(importLine, "Import copied");
    setImportCopied(true);
  }

  async function handleCopyJsx() {
    await copyText(liveJsx, "JSX copied");
    setJsxCopied(true);
  }

  async function openTool(tool: "cursor" | "claude" | "codex" | "v0") {
    await copyText(prompt, `Prompt copied — opening ${tool}`);
    const url = openAiToolUrl(tool, prompt);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function connectMcp() {
    await copyText(buildMcpSnippet(), "MCP snippet copied");
  }

  const stageWidth = VIEWPORTS.find((v) => v.id === viewport)?.width ?? "100%";

  return (
    <Tabs defaultValue="preview" className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-muted/25 px-3 py-2.5 sm:gap-4">
        <TabsList
          aria-label="Example view"
          className="h-9 gap-0.5 rounded-lg border border-border/70 bg-muted/60 p-0.5"
        >
          <TabsTrigger
            value="preview"
            className="h-8 min-w-[6.5rem] rounded-md px-3.5 text-xs leading-none"
          >
            <Eye className="size-3.5 shrink-0" aria-hidden />
            Preview
          </TabsTrigger>
          <TabsTrigger
            value="code"
            className="h-8 min-w-[6.5rem] rounded-md px-3.5 text-xs leading-none"
          >
            <Code2 className="size-3.5 shrink-0" aria-hidden />
            Code
          </TabsTrigger>
        </TabsList>

        <div
          role="group"
          aria-label="Viewport"
          className="flex h-9 items-center gap-0.5 rounded-lg border border-border/70 bg-background/70 p-0.5"
        >
          {VIEWPORTS.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={label}
              aria-pressed={viewport === id}
              className={cn(
                "size-8 rounded-md",
                viewport === id && "bg-accent text-accent-foreground",
              )}
              onClick={() => setViewport(id)}
            >
              <Icon className="size-3.5" aria-hidden />
            </Button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" asChild>
            <Link href={`/docs/preview/${name}`} target="_blank" rel="noreferrer">
              <ExternalLink className="size-3.5" aria-hidden />
              Open
            </Link>
          </Button>

          <SplitButton size="sm">
            <SplitButtonAction className="h-8 gap-1.5 px-2.5 text-xs" onClick={handleCopyPrompt}>
              <Copy className="size-3.5" aria-hidden />
              Copy prompt
            </SplitButtonAction>
            <SplitButtonMenu label="More copy actions">
              <DropdownMenuItem onSelect={() => void handleCopyPrompt()}>
                Copy prompt
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void handleCopyCode()}>Copy code</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void openTool("cursor")}>
                Open in Cursor
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void openTool("claude")}>
                Open in Claude
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void openTool("codex")}>
                Open in Codex
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void openTool("v0")}>Open in v0</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void connectMcp()}>
                Connect to MCP server
              </DropdownMenuItem>
            </SplitButtonMenu>
          </SplitButton>
        </div>
      </div>

      <TabsContent value="preview" className="mt-0 border-0 p-0 outline-none">
        <div
          className={cn(
            "grid gap-0",
            schema ? "lg:grid-cols-[minmax(0,1fr)_220px]" : "grid-cols-1",
          )}
        >
          <div className="relative min-h-56 overflow-auto border-b border-border/70 p-6 lg:border-b-0 lg:border-r">
            <div
              className={cn(
                "mx-auto flex min-h-44 flex-wrap gap-4 rounded-xl border border-dashed border-border/80 bg-background p-6 transition-[max-width] duration-300 ease-out motion-reduce:transition-none",
                align === "center" ? "items-center justify-center" : "items-start justify-start",
              )}
              style={{ maxWidth: stageWidth }}
            >
              {schema ? schema.render(values, setValue) : children}
            </div>
          </div>
          {schema ? (
            <CustomizePanel controls={schema.controls} values={values} setValue={setValue} />
          ) : null}
        </div>
        <div className="border-t border-border/80 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--muted)_42%,transparent),color-mix(in_oklch,var(--card)_88%,var(--muted)))] px-3 py-3">
          <JsxSnippet
            importLine={importLine || undefined}
            code={liveJsx}
            importCopied={importCopied}
            usageCopied={jsxCopied}
            onCopyImport={handleCopyImport}
            onCopyUsage={handleCopyJsx}
          />
        </div>
      </TabsContent>

      <TabsContent value="code" className="mt-0 border-0 p-0 outline-none">
        <div className="relative apolyx-code-panel">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-8 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--muted)_55%,transparent),transparent)]" />
          <CopyButton
            value={code}
            className="absolute right-3 top-3 z-10 rounded-md border border-border/60 bg-background/80 backdrop-blur-sm"
          />
          <div
            className="code-block apolyx-code-block max-h-[480px] overflow-auto"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}

function CustomizePanel({
  controls,
  values,
  setValue,
}: {
  controls: PlaygroundControl[];
  values: PlaygroundValues;
  setValue: (key: string, value: string | boolean) => void;
}) {
  return (
    <aside className="apolyx-rail max-h-[420px] space-y-4 overflow-y-auto bg-muted/15 p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        Customize
      </p>
      <div className="space-y-4">
        {controls.map((control) => {
          if (control.kind === "enum") {
            const id = `pg-${control.key}`;
            return (
              <div key={control.key} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs">
                  {control.label}
                </Label>
                <select
                  id={id}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={String(values[control.key] ?? "")}
                  onChange={(event) => setValue(control.key, event.target.value)}
                >
                  {control.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          if (control.kind === "boolean") {
            return (
              <div key={control.key} className="flex items-center justify-between gap-3">
                <Label htmlFor={`pg-${control.key}`} className="text-xs">
                  {control.label}
                </Label>
                <Switch
                  id={`pg-${control.key}`}
                  size="sm"
                  checked={Boolean(values[control.key])}
                  onCheckedChange={(checked) => setValue(control.key, checked)}
                />
              </div>
            );
          }
          const id = `pg-${control.key}`;
          return (
            <div key={control.key} className="space-y-1.5">
              <Label htmlFor={id} className="text-xs">
                {control.label}
              </Label>
              <input
                id={id}
                type="text"
                placeholder={control.placeholder}
                value={String(values[control.key] ?? "")}
                onChange={(event) => setValue(control.key, event.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
