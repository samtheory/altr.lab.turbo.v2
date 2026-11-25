/**
 * One-shot emitter for Apolyx-S0012 remaining batch (kit + registry + apolyx docs).
 * Run: node scripts/s0012-emit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apolyxRoot = path.resolve(kitRoot, "../../apps/apolyx");
const uiDir = path.join(kitRoot, "src/components/ui");
const registryDir = path.join(kitRoot, "registry");
const demosDir = path.join(apolyxRoot, "src/demos");
const mdxDir = path.join(apolyxRoot, "src/content/docs/components");

/** @type {Array<{slug:string; exportName:string; title:string; description:string; deps?:string[]; registryDeps?:string[]; demo:string; source:string}>} */
const BATCH = [
  {
    slug: "browser-frame",
    exportName: "BrowserFrame",
    title: "Browser Frame",
    description: "Desktop browser chrome shell for screenshots.",
    registryDeps: ["utils"],
    demo: `<BrowserFrame url="apolyx.dev/docs" className="max-w-md">\n  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">Preview</div>\n</BrowserFrame>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type BrowserFrameProps = {\n  children?: React.ReactNode;\n  url?: string;\n  className?: string;\n};\n\nexport function BrowserFrame({ children, url = "apolyx.dev", className }: BrowserFrameProps) {\n  return (\n    <div data-slot="browser-frame" className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-sm", className)}>\n      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">\n        <span className="size-2.5 rounded-full bg-destructive/80" aria-hidden />\n        <span className="size-2.5 rounded-full bg-warning/80" aria-hidden />\n        <span className="size-2.5 rounded-full bg-success/80" aria-hidden />\n        <span className="ml-2 truncate rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground">{url}</span>\n      </div>\n      <div className="bg-background">{children}</div>\n    </div>\n  );\n}\n`,
  },
  {
    slug: "phone-frame",
    exportName: "PhoneFrame",
    title: "Phone Frame",
    description: "iOS-style device shell with notch.",
    registryDeps: ["utils"],
    demo: `<PhoneFrame className="max-w-[220px]">\n  <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">App</div>\n</PhoneFrame>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type PhoneFrameProps = {\n  children?: React.ReactNode;\n  className?: string;\n};\n\nexport function PhoneFrame({ children, className }: PhoneFrameProps) {\n  return (\n    <div data-slot="phone-frame" className={cn("relative rounded-[2rem] border-[6px] border-foreground/15 bg-foreground/10 p-1 shadow-md", className)}>\n      <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-foreground/20" aria-hidden />\n      <div className="overflow-hidden rounded-[1.6rem] bg-background">{children}</div>\n    </div>\n  );\n}\n`,
  },
  {
    slug: "android-frame",
    exportName: "AndroidFrame",
    title: "Android Frame",
    description: "Android device shell with status bar.",
    registryDeps: ["utils"],
    demo: `<AndroidFrame className="max-w-[220px]">\n  <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">App</div>\n</AndroidFrame>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type AndroidFrameProps = {\n  children?: React.ReactNode;\n  className?: string;\n};\n\nexport function AndroidFrame({ children, className }: AndroidFrameProps) {\n  return (\n    <div data-slot="android-frame" className={cn("overflow-hidden rounded-[1.25rem] border-2 border-border bg-card shadow-sm", className)}>\n      <div className="flex h-6 items-center justify-between bg-muted/50 px-3 text-[10px] text-muted-foreground">\n        <span>9:41</span>\n        <span className="flex gap-1" aria-hidden>\n          <span className="size-1 rounded-full bg-current" />\n          <span className="size-1 rounded-full bg-current opacity-70" />\n        </span>\n      </div>\n      <div className="bg-background">{children}</div>\n      <div className="mx-auto my-1 h-1 w-16 rounded-full bg-foreground/20" aria-hidden />\n    </div>\n  );\n}\n`,
  },
  {
    slug: "social-quote-card",
    exportName: "SocialQuoteCard",
    title: "Social Quote Card",
    description: "Generic social post / quote embed card.",
    registryDeps: ["utils"],
    demo: `<SocialQuoteCard name="Apolyx" handle="@apolyx" text="Ship presentational primitives with taste — not purple slop." />`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type SocialQuoteCardProps = {\n  name: string;\n  handle?: string;\n  text: string;\n  avatar?: React.ReactNode;\n  className?: string;\n};\n\nexport function SocialQuoteCard({ name, handle, text, avatar, className }: SocialQuoteCardProps) {\n  return (\n    <figure data-slot="social-quote-card" className={cn("max-w-md rounded-xl border border-border bg-card p-4 shadow-sm", className)}>\n      <div className="flex items-center gap-3">\n        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">{avatar ?? name.slice(0, 1)}</div>\n        <figcaption>\n          <div className="font-medium leading-none">{name}</div>\n          {handle ? <div className="text-sm text-muted-foreground">{handle}</div> : null}\n        </figcaption>\n      </div>\n      <blockquote className="mt-3 text-[15px] leading-relaxed text-foreground/90">&ldquo;{text}&rdquo;</blockquote>\n    </figure>\n  );\n}\n`,
  },
  {
    slug: "orbit-ring",
    exportName: "OrbitRing",
    title: "Orbit Ring",
    description: "Icons orbiting a center point.",
    deps: ["motion"],
    registryDeps: ["utils", "use-reduced-motion"],
    demo: `<OrbitRing className="size-40">\n  <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs">A</span>\n  <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-xs">B</span>\n</OrbitRing>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type OrbitRingProps = {\n  children: React.ReactNode;\n  className?: string;\n  duration?: number;\n  radius?: number;\n};\n\nexport function OrbitRing({ children, className, duration = 18, radius = 72 }: OrbitRingProps) {\n  const reduce = useReducedMotion();\n  const items = React.Children.toArray(children);\n  const n = Math.max(items.length, 1);\n  return (\n    <div data-slot="orbit-ring" className={cn("relative grid place-items-center", className)} style={{ ["--orbit-r" as string]: radius + "px", ["--orbit-dur" as string]: duration + "s" }}>\n      <div className="relative z-10 size-12 rounded-full border border-border bg-muted/50" aria-hidden />\n      {items.map((item, i) => (\n        <div\n          key={i}\n          className={cn("absolute left-1/2 top-1/2", !reduce && "apolyx-orbit-item")}\n          style={{ ["--orbit-i" as string]: i, ["--orbit-n" as string]: n }}\n        >\n          {item}\n        </div>\n      ))}\n    </div>\n  );\n}\n`,
  },
  {
    slug: "magnify-lens",
    exportName: "MagnifyLens",
    title: "Magnify Lens",
    description: "Hover magnifier over content.",
    deps: ["motion"],
    registryDeps: ["utils"],
    demo: `<MagnifyLens zoom={1.6} className="max-w-sm">\n  <img src="/placeholder.svg" alt="" className="w-full rounded-lg" />\n</MagnifyLens>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type MagnifyLensProps = {\n  children: React.ReactNode;\n  className?: string;\n  zoom?: number;\n  lensSize?: number;\n};\n\nexport function MagnifyLens({ children, className, zoom = 1.75, lensSize = 120 }: MagnifyLensProps) {\n  const ref = React.useRef<HTMLDivElement>(null);\n  const [pos, setPos] = React.useState<{ x: number; y: number; bg: string } | null>(null);\n\n  return (\n    <div\n      ref={ref}\n      data-slot="magnify-lens"\n      className={cn("relative overflow-hidden rounded-lg", className)}\n      onMouseMove={(e) => {\n        const el = ref.current;\n        if (!el) return;\n        const r = el.getBoundingClientRect();\n        const x = e.clientX - r.left;\n        const y = e.clientY - r.top;\n        setPos({ x, y, bg: ((x / r.width) * 100).toFixed(1) + "% " + ((y / r.height) * 100).toFixed(1) + "%" });\n      }}\n      onMouseLeave={() => setPos(null)}\n    >\n      {children}\n      {pos ? (\n        <div\n          className="pointer-events-none absolute rounded-full border-2 border-primary/40 shadow-lg"\n          style={{\n            width: lensSize,\n            height: lensSize,\n            left: pos.x - lensSize / 2,\n            top: pos.y - lensSize / 2,\n            background: "color-mix(in oklab, var(--primary) 12%, transparent)",\n            backdropFilter: "blur(0px)",\n            transform: "scale(" + zoom + ")",\n            transformOrigin: pos.bg,\n          }}\n          aria-hidden\n        />\n      ) : null}\n    </div>\n  );\n}\n`,
  },
  {
    slug: "cursor-glow",
    exportName: "CursorGlow",
    title: "Cursor Glow",
    description: "Soft cursor-following highlight in a region.",
    deps: ["motion"],
    registryDeps: ["utils", "use-reduced-motion"],
    demo: `<CursorGlow className="h-40 w-full max-w-md rounded-xl border border-border">\n  <p className="p-6 text-sm text-muted-foreground">Move the pointer here.</p>\n</CursorGlow>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { motion, useMotionTemplate, useMotionValue } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type CursorGlowProps = {\n  children?: React.ReactNode;\n  className?: string;\n};\n\nexport function CursorGlow({ children, className }: CursorGlowProps) {\n  const reduce = useReducedMotion();\n  const x = useMotionValue(0);\n  const y = useMotionValue(0);\n  const background = useMotionTemplate\`radial-gradient(180px circle at \${x}px \${y}px, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)\`;\n\n  return (\n    <div\n      data-slot="cursor-glow"\n      className={cn("relative overflow-hidden", className)}\n      onPointerMove={(e) => {\n        const r = e.currentTarget.getBoundingClientRect();\n        x.set(e.clientX - r.left);\n        y.set(e.clientY - r.top);\n      }}\n    >\n      {!reduce ? <motion.div className="pointer-events-none absolute inset-0" style={{ background }} aria-hidden /> : null}\n      <div className="relative z-10">{children}</div>\n    </div>\n  );\n}\n`,
  },
  {
    slug: "edge-fade-blur",
    exportName: "EdgeFadeBlur",
    title: "Edge Fade Blur",
    description: "Progressive blur masks at scroll edges.",
    registryDeps: ["utils"],
    demo: `<EdgeFadeBlur className="h-32 w-full max-w-md overflow-y-auto rounded-lg border border-border p-4">\n  <p className="text-sm">Long scrollable content with soft top and bottom fades.</p>\n  <p className="mt-24 text-sm text-muted-foreground">End.</p>\n</EdgeFadeBlur>`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type EdgeFadeBlurProps = React.HTMLAttributes<HTMLDivElement> & {\n  fade?: number;\n};\n\nexport function EdgeFadeBlur({ className, children, fade = 48, ...props }: EdgeFadeBlurProps) {\n  return (\n    <div data-slot="edge-fade-blur" className={cn("relative", className)} {...props}>\n      <div\n        className="pointer-events-none sticky top-0 z-10 h-0 w-full"\n        style={{\n          boxShadow: "0 " + fade + "px " + fade + "px -" + fade / 2 + "px color-mix(in oklab, var(--background) 90%, transparent) inset",\n        }}\n        aria-hidden\n      />\n      {children}\n      <div\n        className="pointer-events-none sticky bottom-0 z-10 h-0 w-full"\n        style={{\n          boxShadow: "0 -" + fade + "px " + fade + "px -" + fade / 2 + "px color-mix(in oklab, var(--background) 90%, transparent) inset",\n        }}\n        aria-hidden\n      />\n    </div>\n  );\n}\n`,
  },
  {
    slug: "dot-map",
    exportName: "DotMap",
    title: "Dot Map",
    description: "Lightweight SVG world dot map.",
    registryDeps: ["utils"],
    demo: `<DotMap className="h-40 w-full max-w-lg text-primary/40" />`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nconst DOTS = "M8 12h1v1H8zm4 0h1v1h-1zm8 2h1v1h-1zm12 4h1v1h-1zm-6 6h1v1h-1zm14 0h1v1h-1zm-20 8h1v1h-1zm24 2h1v1h-1z";\n\nexport type DotMapProps = {\n  className?: string;\n};\n\nexport function DotMap({ className }: DotMapProps) {\n  return (\n    <svg data-slot="dot-map" viewBox="0 0 120 48" className={cn("w-full fill-current", className)} role="img" aria-label="World map">\n      <rect width="120" height="48" fill="none" />\n      {Array.from({ length: 80 }, (_, i) => (\n        <circle key={i} cx={(i * 17) % 118 + 1} cy={(i * 11) % 46 + 1} r={0.65} />\n      ))}\n    </svg>\n  );\n}\n`,
  },
  {
    slug: "shine-frame",
    exportName: "ShineFrame",
    title: "Shine Frame",
    description: "Conic shine border frame.",
    registryDeps: ["utils", "use-reduced-motion"],
    demo: `<ShineFrame className="max-w-xs"><Formfoo className="p-6">Content</Formfoo></ShineFrame>`.replace("Formfoo", "div").replace("<Formfoo", "<div").replace("</Formfoo>", "</div>"),
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type ShineFrameProps = {\n  children: React.ReactNode;\n  className?: string;\n};\n\nexport function ShineFrame({ children, className }: ShineFrameProps) {\n  const reduce = useReducedMotion();\n  return (\n    <div data-slot="shine-frame" className={cn("relative rounded-xl p-px", className)}>\n      <div className={cn("absolute inset-0 rounded-xl", !reduce && "apolyx-shine-frame")} aria-hidden />\n      <div className="relative rounded-[calc(var(--radius)-1px)] bg-card">{children}</div>\n    </div>\n  );\n}\n`,
  },
];

// Fix shine-frame demo typo
const shine = BATCH.find((c) => c.slug === "shine-frame");
if (shine) {
  shine.demo = `<ShineFrame className="max-w-xs"><div className="p-6 text-sm">Framed content</div></ShineFrame>`;
}

for (const c of BATCH) {
  const file = path.join(uiDir, `${c.slug}.tsx`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, c.source);

  const reg = {
    $schema: "./schema.json",
    name: c.slug,
    type: "ui",
    title: c.title,
    description: `Apolyx S0012 — ${c.title}`,
    dependencies: c.deps ? Object.fromEntries(c.deps.map((d) => [d, "^12.23.12"])) : { motion: "^12.23.12" },
    files: [{ path: `src/components/ui/${c.slug}.tsx`, target: `${c.slug}.tsx` }],
    registryDependencies: c.registryDeps ?? ["utils", "use-reduced-motion"],
    docs: `components/${c.slug}`,
  };
  fs.writeFileSync(path.join(registryDir, `${c.slug}.json`), JSON.stringify(reg, null, 2) + "\n");

  const demo = `"use client";\n\nimport { ${c.exportName} } from "@altr/apolyx";\n\nexport default function Demo() {\n  return (\n    ${c.demo}\n  );\n}\n`;
  fs.writeFileSync(path.join(demosDir, `${c.slug}-demo.tsx`), demo);

  const mdx = `<ComponentPreview name="${c.slug}-demo" />\n\n## Installation\n\n<InstallTabs name="${c.slug}" exports="${c.exportName}" />\n\n## Usage\n\n\`\`\`tsx\nimport { ${c.exportName} } from "@altr/apolyx";\n\`\`\`\n`;
  fs.writeFileSync(path.join(mdxDir, `${c.slug}.mdx`), mdx);
}

console.log(`Emitted ${BATCH.length} S0012 scaffolds (skipped existing kit files).`);