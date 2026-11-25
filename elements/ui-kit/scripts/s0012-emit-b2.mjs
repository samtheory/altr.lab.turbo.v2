import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apolyxRoot = path.resolve(kitRoot, "../../apps/apolyx");
const uiDir = path.join(kitRoot, "src/components/ui");
const registryDir = path.join(kitRoot, "registry");
const demosDir = path.join(apolyxRoot, "src/demos");
const mdxDir = path.join(apolyxRoot, "src/content/docs/components");

function emit(c) {
  const file = path.join(uiDir, `${c.slug}.tsx`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, c.source);
  const reg = {
    $schema: "./schema.json",
    name: c.slug,
    type: "ui",
    title: c.title,
    description: `Apolyx S0012 — ${c.title}`,
    dependencies: { motion: "^12.23.12" },
    files: [{ path: `src/components/ui/${c.slug}.tsx`, target: `${c.slug}.tsx` }],
    registryDependencies: c.registryDeps ?? ["utils", "use-reduced-motion"],
    docs: `components/${c.slug}`,
  };
  fs.writeFileSync(path.join(registryDir, `${c.slug}.json`), JSON.stringify(reg, null, 2) + "\n");
  const demo = `"use client";\n\nimport { ${c.exportName} } from "@altr/apolyx";\n\nexport default function Demo() {\n  return ${c.demo};\n}\n`;
  fs.writeFileSync(path.join(demosDir, `${c.slug}-demo.tsx`), demo);
  const mdx = `<ComponentPreview name="${c.slug}-demo" />\n\n## Installation\n\n<InstallTabs name="${c.slug}" exports="${c.exportName}" />\n\n## Usage\n\n\`\`\`tsx\nimport { ${c.exportName} } from "@altr/apolyx";\n\`\`\`\n`;
  fs.writeFileSync(path.join(mdxDir, `${c.slug}.mdx`), mdx);
}

const BATCH = [
  {
    slug: "spotlight-card",
    exportName: "SpotlightCard",
    title: "Spotlight Card",
    demo: `(<SpotlightCard className="max-w-sm p-6"><p className="text-sm">Move the pointer.</p></SpotlightCard>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type SpotlightCardProps = React.HTMLAttributes<HTMLDivElement>;\n\nexport function SpotlightCard({ className, children, onPointerMove, ...props }: SpotlightCardProps) {\n  const reduce = useReducedMotion();\n  return (\n    <div\n      data-slot="spotlight-card"\n      className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)}\n      onPointerMove={(e) => {\n        if (reduce) return;\n        const r = e.currentTarget.getBoundingClientRect();\n        e.currentTarget.style.setProperty("--spot-x", `${e.clientX - r.left}px`);\n        e.currentTarget.style.setProperty("--spot-y", `${e.clientY - r.top}px`);\n        onPointerMove?.(e);\n      }}\n      {...props}\n    >\n      {!reduce ? (\n        <div\n          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100"\n          style={{\n            background:\n              "radial-gradient(280px circle at var(--spot-x,50%) var(--spot-y,50%), color-mix(in oklab, var(--primary) 18%, transparent), transparent 65%)",\n          }}\n          aria-hidden\n        />\n      ) : null}\n      <div className="relative z-10">{children}</div>\n    </div>\n  );\n}\n`,
  },
  {
    slug: "glare-surface",
    exportName: "GlareSurface",
    title: "Glare Surface",
    demo: `(<GlareSurface className="max-w-xs rounded-xl p-8"><span className="font-medium">Tilt me</span></GlareSurface>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type GlareSurfaceProps = {\n  children?: React.ReactNode;\n  className?: string;\n};\n\nexport function GlareSurface({ children, className }: GlareSurfaceProps) {\n  const reduce = useReducedMotion();\n  const x = useMotionValue(0.5);\n  const y = useMotionValue(0.5);\n  const sx = useSpring(x, { stiffness: 200, damping: 22 });\n  const sy = useSpring(y, { stiffness: 200, damping: 22 });\n  const glare = useMotionTemplate`radial-gradient(400px at ${sx}% ${sy}%, color-mix(in oklab, var(--background) 15%, transparent), transparent 60%)`;\n  return (\n    <motion.div\n      data-slot="glare-surface"\n      className={cn("relative overflow-hidden border border-border bg-card", className)}\n      onPointerMove={(e) => {\n        const r = e.currentTarget.getBoundingClientRect();\n        x.set(((e.clientX - r.left) / r.width) * 100);\n        y.set(((e.clientY - r.top) / r.height) * 100);\n      }}\n      style={reduce ? undefined : { rotateX: useSpring(useMotionValue(0)), rotateY: useSpring(useMotionValue(0)) }}\n    >\n      {!reduce ? <motion.div className="pointer-events-none absolute inset-0" style={{ background: glare }} aria-hidden /> : null}\n      <div className="relative z-10">{children}</div>\n    </motion.div>\n  );\n}\n`,
  },
  {
    slug: "meteor-shower",
    exportName: "MeteorShower",
    title: "Meteor Shower",
    demo: `(<MeteorShower className="h-48 w-full max-w-lg rounded-xl border border-border" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type MeteorShowerProps = { className?: string; count?: number };\n\nexport function MeteorShower({ className, count = 12 }: MeteorShowerProps) {\n  const reduce = useReducedMotion();\n  const meteors = React.useMemo(\n    () => Array.from({ length: count }, (_, i) => ({ id: i, left: `${(i * 37) % 100}%`, delay: (i % 5) * 0.7 })),\n    [count],\n  );\n  return (\n    <div data-slot="meteor-shower" className={cn("relative overflow-hidden", className)}>\n      {!reduce\n        ? meteors.map((m) => (\n            <span\n              key={m.id}\n              className="apolyx-meteor absolute top-0 h-px w-16 rotate-[215deg] bg-gradient-to-r from-transparent via-primary/60 to-transparent"\n              style={{ left: m.left, animationDelay: `${m.delay}s` }}\n              aria-hidden\n            />\n          ))\n        : null}\n    </div>\n  );\n}\n`,
  },
  {
    slug: "gradient-glow-card",
    exportName: "GradientGlowCard",
    title: "Gradient Glow Card",
    demo: `(<GradientGlowCard className="max-w-xs p-6"><p className="text-sm">Neon edge glow</p></GradientGlowCard>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type GradientGlowCardProps = { children?: React.ReactNode; className?: string };\n\nexport function GradientGlowCard({ children, className }: GradientGlowCardProps) {\n  const reduce = useReducedMotion();\n  return (\n    <div data-slot="gradient-glow-card" className={cn("relative rounded-xl p-px", className)}>\n      <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-br from-primary via-info to-success opacity-80 blur-sm", reduce && "opacity-40")} aria-hidden />\n      <div className="relative rounded-[calc(var(--radius)-1px)] bg-card p-6">{children}</div>\n    </div>\n  );\n}\n`,
  },
  {
    slug: "confetti-burst",
    exportName: "ConfettiBurst",
    title: "Confetti Burst",
    demo: `(<ConfettiBurst active className="relative h-32 w-full max-w-md rounded-xl border border-border" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { AnimatePresence, motion } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type ConfettiBurstProps = { className?: string; active?: boolean; count?: number };\n\nexport function ConfettiBurst({ className, active = true, count = 24 }: ConfettiBurstProps) {\n  const reduce = useReducedMotion();\n  const pieces = React.useMemo(\n    () => Array.from({ length: count }, (_, i) => ({ id: i, x: Math.random() * 100, tone: i % 4 })),\n    [count],\n  );\n  return (\n    <div data-slot="confetti-burst" className={cn("pointer-events-none overflow-hidden", className)}>\n      <AnimatePresence>\n        {active && !reduce\n          ? pieces.map((p) => (\n              <motion.span\n                key={p.id}\n                className="absolute top-0 size-2 rounded-sm bg-primary"\n                initial={{ opacity: 1, y: 0, x: `${p.x}%` }}\n                animate={{ opacity: 0, y: 120, rotate: 180 }}\n                exit={{ opacity: 0 }}\n                transition={{ duration: 1.2, delay: p.id * 0.02 }}\n                style={{ background: `var(--${["primary", "success", "warning", "info"][p.tone]})` }}\n              />\n            ))\n          : null}\n      </AnimatePresence>\n    </div>\n  );\n}\n`,
  },
  {
    slug: "theme-morph-toggle",
    exportName: "ThemeMorphToggle",
    title: "Theme Morph Toggle",
    demo: `(<ThemeMorphToggle />)`,
    registryDeps: ["utils", "button"],
    source: `"use client";\n\nimport * as React from "react";\nimport { Moon, Sun } from "lucide-react";\nimport { AnimatePresence, motion } from "motion/react";\nimport { useTheme } from "next-themes";\nimport { cn } from "../../lib/utils";\nimport { Button, type ButtonProps } from "./button";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type ThemeMorphToggleProps = {\n  className?: string;\n  size?: ButtonProps["size"];\n  variant?: ButtonProps["variant"];\n};\n\nexport function ThemeMorphToggle({ className, size = "icon", variant = "outline" }: ThemeMorphToggleProps) {\n  const { resolvedTheme, setTheme } = useTheme();\n  const [mounted, setMounted] = React.useState(false);\n  const reduce = useReducedMotion();\n  React.useEffect(() => setMounted(true), []);\n  if (!mounted) return <Button variant={variant} size={size} className={cn(className)} disabled aria-label="Toggle theme"><Sun className="size-4" /></Button>;\n  const dark = resolvedTheme === "dark";\n  return (\n    <Button\n      variant={variant}\n      size={size}\n      className={cn("relative overflow-hidden", className)}\n      aria-label={dark ? "Light mode" : "Dark mode"}\n      onClick={() => setTheme(dark ? "light" : "dark")}\n    >\n      <AnimatePresence mode="wait" initial={false}>\n        <motion.span\n          key={dark ? "sun" : "moon"}\n          initial={reduce ? false : { opacity: 0, rotate: -40, scale: 0.6 }}\n          animate={{ opacity: 1, rotate: 0, scale: 1 }}\n          exit={reduce ? undefined : { opacity: 0, rotate: 40, scale: 0.6 }}\n          transition={{ duration: 0.2 }}\n        >\n          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}\n        </motion.span>\n      </AnimatePresence>\n    </Button>\n  );\n}\n`,
  },
  {
    slug: "text-motion",
    exportName: "TextMotion",
    title: "Text Motion",
    demo: `(<TextMotion preset="rise" className="text-xl font-semibold">Animated copy</TextMotion>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { motion } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type TextMotionPreset = "rise" | "fade" | "blur";\nexport type TextMotionProps = {\n  children: React.ReactNode;\n  preset?: TextMotionPreset;\n  className?: string;\n  as?: "span" | "p" | "h2";\n};\n\nexport function TextMotion({ children, preset = "rise", className, as: Tag = "span" }: TextMotionProps) {\n  const reduce = useReducedMotion();\n  const hidden =\n    preset === "blur"\n      ? { opacity: 0, filter: "blur(6px)" }\n      : preset === "fade"\n        ? { opacity: 0 }\n        : { opacity: 0, y: 10 };\n  const show = { opacity: 1, y: 0, filter: "blur(0px)" };\n  const Comp = motion.create(Tag);\n  return (\n    <Comp\n      data-slot="text-motion"\n      className={cn(className)}\n      initial={reduce ? false : hidden}\n      whileInView={show}\n      viewport={{ once: true, amount: 0.4 }}\n      transition={{ duration: reduce ? 0 : 0.45 }}\n    >\n      {children}\n    </Comp>\n  );\n}\n`,
  },
  {
    slug: "line-shadow-text",
    exportName: "LineShadowText",
    title: "Line Shadow Text",
    demo: `(<LineShadowText className="text-4xl font-bold">Shadow</LineShadowText>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type LineShadowTextProps = {\n  children: React.ReactNode;\n  className?: string;\n  as?: "span" | "h1" | "h2";\n};\n\nexport function LineShadowText({ children, className, as: Tag = "span" }: LineShadowTextProps) {\n  return (\n    <Tag data-slot="line-shadow-text" className={cn("apolyx-line-shadow-text", className)}>\n      {children}\n    </Tag>\n  );\n}\n`,
  },
  {
    slug: "gradient-flow-text",
    exportName: "GradientFlowText",
    title: "Gradient Flow Text",
    demo: `(<GradientFlowText className="text-3xl font-semibold">Flow</GradientFlowText>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type GradientFlowTextProps = { children: React.ReactNode; className?: string; as?: "span" | "h2" };\n\nexport function GradientFlowText({ children, className, as: Tag = "span" }: GradientFlowTextProps) {\n  const reduce = useReducedMotion();\n  return (\n    <Tag data-slot="gradient-flow-text" className={cn(!reduce && "apolyx-gradient-flow-text", className)}>\n      {children}\n    </Tag>\n  );\n}\n`,
  },
  {
    slug: "scramble-text",
    exportName: "ScrambleText",
    title: "Scramble Text",
    demo: `(<ScrambleText text="Apolyx kit" className="text-xl font-mono" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nconst POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";\n\nexport type ScrambleTextProps = { text: string; className?: string; duration?: number };\n\nexport function ScrambleText({ text, className, duration = 900 }: ScrambleTextProps) {\n  const reduce = useReducedMotion();\n  const [out, setOut] = React.useState(text);\n  React.useEffect(() => {\n    if (reduce) {\n      setOut(text);\n      return;\n    }\n    const start = performance.now();\n    let frame = 0;\n    const tick = (now: number) => {\n      const t = Math.min(1, (now - start) / duration);\n      const settled = Math.floor(t * text.length);\n      const scrambled = Array.from(text)\n        .map((ch, i) => (i < settled || ch === " " ? ch : POOL[(i + frame) % POOL.length]!))\n        .join("");\n      setOut(scrambled);\n      frame++;\n      if (t < 1) requestAnimationFrame(tick);\n      else setOut(text);\n    };\n    requestAnimationFrame(tick);\n  }, [text, duration, reduce]);\n  return (\n    <span data-slot="scramble-text" className={cn(className)} aria-label={text}>\n      {out}\n    </span>\n  );\n}\n`,
  },
  {
    slug: "scroll-velocity-text",
    exportName: "ScrollVelocityText",
    title: "Scroll Velocity Text",
    demo: `(<ScrollVelocityText className="text-2xl font-semibold">Scroll faster</ScrollVelocityText>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { motion, useScroll, useVelocity, useTransform } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type ScrollVelocityTextProps = { children: React.ReactNode; className?: string };\n\nexport function ScrollVelocityText({ children, className }: ScrollVelocityTextProps) {\n  const reduce = useReducedMotion();\n  const { scrollY } = useScroll();\n  const velocity = useVelocity(scrollY);\n  const skew = useTransform(velocity, [-2000, 0, 2000], [-6, 0, 6]);\n  if (reduce) return <span className={cn(className)}>{children}</span>;\n  return (\n    <motion.span data-slot="scroll-velocity-text" style={{ skewX: skew }} className={cn("inline-block", className)}>\n      {children}\n    </motion.span>\n  );\n}\n`,
  },
  {
    slug: "sparkle-text",
    exportName: "SparkleText",
    title: "Sparkle Text",
    demo: `(<SparkleText className="text-2xl font-semibold">Sparkle</SparkleText>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type SparkleTextProps = { children: React.ReactNode; className?: string };\n\nexport function SparkleText({ children, className }: SparkleTextProps) {\n  const reduce = useReducedMotion();\n  return (\n    <span data-slot="sparkle-text" className={cn("relative inline-block", className)}>\n      {children}\n      {!reduce ? <span className="apolyx-sparkle-text pointer-events-none absolute -inset-1" aria-hidden /> : null}\n    </span>\n  );\n}\n`,
  },
  {
    slug: "morph-text",
    exportName: "MorphText",
    title: "Morph Text",
    demo: `(<MorphText items={["Design", "Ship", "Iterate"]} className="text-xl font-medium" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { AnimatePresence, motion } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type MorphTextProps = { items: string[]; interval?: number; className?: string };\n\nexport function MorphText({ items, interval = 2400, className }: MorphTextProps) {\n  const reduce = useReducedMotion();\n  const [i, setI] = React.useState(0);\n  React.useEffect(() => {\n    if (reduce || items.length < 2) return;\n    const id = setInterval(() => setI((v) => (v + 1) % items.length), interval);\n    return () => clearInterval(id);\n  }, [items.length, interval, reduce]);\n  return (\n    <span data-slot="morph-text" className={cn("relative inline-flex min-w-[6ch]", className)}>\n      <AnimatePresence mode="wait">\n        <motion.span\n          key={items[i]}\n          initial={reduce ? false : { opacity: 0, y: 8 }}\n          animate={{ opacity: 1, y: 0 }}\n          exit={reduce ? undefined : { opacity: 0, y: -8 }}\n          transition={{ duration: 0.25 }}\n        >\n          {items[i]}\n        </motion.span>\n      </AnimatePresence>\n    </span>\n  );\n}\n`,
  },
  {
    slug: "spin-label",
    exportName: "SpinLabel",
    title: "Spin Label",
    demo: `(<SpinLabel text="ORBIT • " className="size-32 text-xs uppercase tracking-widest text-muted-foreground" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type SpinLabelProps = { text: string; className?: string; duration?: number };\n\nexport function SpinLabel({ text, className, duration = 12 }: SpinLabelProps) {\n  const reduce = useReducedMotion();\n  const id = React.useId();\n  const pathId = `spin-${id.replace(/:/g, "")}`;\n  const loop = (text.trim() + " • ").repeat(4);\n  return (\n    <svg data-slot="spin-label" viewBox="0 0 100 100" className={cn(className)} aria-hidden>\n      <defs>\n        <path id={pathId} d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />\n      </defs>\n      <text className="fill-current">\n        <textPath href={`#${pathId}`} className={cn(!reduce && "apolyx-spin-label")} style={{ ["--spin-dur" as string]: `${duration}s` }}>\n          {loop}\n        </textPath>\n      </text>\n    </svg>\n  );\n}\n`,
  },
  {
    slug: "comic-text",
    exportName: "ComicText",
    title: "Comic Text",
    demo: `(<ComicText className="text-3xl">POW!</ComicText>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type ComicTextProps = { children: React.ReactNode; className?: string };\n\nexport function ComicText({ children, className }: ComicTextProps) {\n  return (\n    <span data-slot="comic-text" className={cn("apolyx-comic-text font-black uppercase", className)}>\n      {children}\n    </span>\n  );\n}\n`,
  },
  {
    slug: "kinetic-text",
    exportName: "KineticText",
    title: "Kinetic Text",
    demo: `(<KineticText text="Bounce" className="text-2xl font-semibold" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { motion } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type KineticTextProps = { text: string; className?: string };\n\nexport function KineticText({ text, className }: KineticTextProps) {\n  const reduce = useReducedMotion();\n  return (\n    <span data-slot="kinetic-text" className={cn("inline-flex", className)} aria-label={text}>\n      {Array.from(text).map((ch, i) => (\n        <motion.span\n          key={`${ch}-${i}`}\n          className="inline-block"\n          animate={reduce ? undefined : { y: [0, -4, 0] }}\n          transition={{ duration: 0.5, delay: i * 0.05, repeat: Infinity, repeatDelay: 1.2 }}\n        >\n          {ch === " " ? "\\u00a0" : ch}\n        </motion.span>\n      ))}\n    </span>\n  );\n}\n`,
  },
  {
    slug: "file-tree",
    exportName: "FileTree",
    title: "File Tree",
    demo: `(<FileTree items={[{ name: "src", children: [{ name: "index.ts" }] }]} />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { ChevronRight, File, Folder } from "lucide-react";\nimport { cn } from "../../lib/utils";\n\nexport type FileTreeNode = { name: string; children?: FileTreeNode[] };\nexport type FileTreeProps = { items: FileTreeNode[]; className?: string };\n\nfunction Node({ node, depth = 0 }: { node: FileTreeNode; depth?: number }) {\n  const [open, setOpen] = React.useState(depth === 0);\n  const hasKids = Boolean(node.children?.length);\n  return (\n    <li className="list-none">\n      <button\n        type="button"\n        className="flex w-full items-center gap-1 rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted/60"\n        style={{ paddingLeft: depth * 12 }}\n        onClick={() => hasKids && setOpen((v) => !v)}\n      >\n        {hasKids ? <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} /> : <span className="size-3.5" />}\n        {hasKids ? <Folder className="size-3.5 text-muted-foreground" /> : <File className="size-3.5 text-muted-foreground" />}\n        <span>{node.name}</span>\n      </button>\n      {hasKids && open ? (\n        <ul>{node.children!.map((c) => <Node key={c.name} node={c} depth={depth + 1} />)}</ul>\n      ) : null}\n    </li>\n  );\n}\n\nexport function FileTree({ items, className }: FileTreeProps) {\n  return (\n    <ul data-slot="file-tree" className={cn("rounded-lg border border-border bg-card p-2", className)}>\n      {items.map((n) => (\n        <Node key={n.name} node={n} />\n      ))}\n    </ul>\n  );\n}\n`,
  },
  {
    slug: "pixel-reveal",
    exportName: "PixelReveal",
    title: "Pixel Reveal",
    demo: `(<PixelReveal className="h-32 w-full max-w-sm rounded-lg bg-muted" revealed={0.6} />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type PixelRevealProps = { className?: string; revealed?: number; cols?: number; rows?: number };\n\nexport function PixelReveal({ className, revealed = 0.5, cols = 16, rows = 8 }: PixelRevealProps) {\n  const cells = cols * rows;\n  const cutoff = Math.floor(cells * revealed);\n  return (\n    <div\n      data-slot="pixel-reveal"\n      className={cn("grid gap-px bg-border p-px", className)}\n      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}\n    >\n      {Array.from({ length: cells }, (_, i) => (\n        <div key={i} className={cn("aspect-square", i < cutoff ? "bg-primary/25" : "bg-muted animate-pulse")} />\n      ))}\n    </div>\n  );\n}\n`,
  },
  {
    slug: "pulse-button",
    exportName: "PulseButton",
    title: "Pulse Button",
    demo: `(<PulseButton>Subscribe</PulseButton>)`,
    registryDeps: ["utils", "button", "use-reduced-motion"],
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { Button, type ButtonProps } from "./button";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type PulseButtonProps = ButtonProps;\n\nexport function PulseButton({ className, children, ...props }: PulseButtonProps) {\n  const reduce = useReducedMotion();\n  return (\n    <Button data-slot="pulse-button" className={cn(!reduce && "apolyx-pulse-button", className)} {...props}>\n      {children}\n    </Button>\n  );\n}\n`,
  },
  {
    slug: "magnet-button",
    exportName: "MagnetButton",
    title: "Magnet Button",
    demo: `(<MagnetButton>Hover</MagnetButton>)`,
    registryDeps: ["utils", "button", "use-reduced-motion"],
    source: `"use client";\n\nimport * as React from "react";\nimport { motion, useMotionValue, useSpring } from "motion/react";\nimport { cn } from "../../lib/utils";\nimport { Button, type ButtonProps } from "./button";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nexport type MagnetButtonProps = ButtonProps;\n\nexport function MagnetButton({ className, children, ...props }: MagnetButtonProps) {\n  const reduce = useReducedMotion();\n  const x = useMotionValue(0);\n  const y = useMotionValue(0);\n  const sx = useSpring(x, { stiffness: 300, damping: 20 });\n  const sy = useSpring(y, { stiffness: 300, damping: 20 });\n  if (reduce) return <Button className={className} {...props}>{children}</Button>;\n  return (\n    <motion.div\n      style={{ x: sx, y: sy }}\n      onPointerMove={(e) => {\n        const r = e.currentTarget.getBoundingClientRect();\n        x.set((e.clientX - r.left - r.width / 2) * 0.15);\n        y.set((e.clientY - r.top - r.height / 2) * 0.15);\n      }}\n      onPointerLeave={() => {\n        x.set(0);\n        y.set(0);\n      }}\n      className="inline-block"\n    >\n      <Button data-slot="magnet-button" className={cn(className)} {...props}>{children}</Button>\n    </motion.div>\n  );\n}\n`,
  },
  {
    slug: "progress-ring",
    exportName: "ProgressRing",
    title: "Progress Ring",
    demo: `(<ProgressRing value={68} className="size-24" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type ProgressRingProps = { value?: number; max?: number; className?: string; strokeWidth?: number };\n\nexport function ProgressRing({ value = 0, max = 100, className, strokeWidth = 6 }: ProgressRingProps) {\n  const pct = Math.min(100, Math.max(0, (value / max) * 100));\n  const r = 42;\n  const c = 2 * Math.PI * r;\n  const dash = (pct / 100) * c;\n  return (\n    <svg data-slot="progress-ring" viewBox="0 0 100 100" className={cn(className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>\n      <circle cx="50" cy="50" r={r} className="stroke-muted" strokeWidth={strokeWidth} fill="none" />\n      <circle\n        cx="50"\n        cy="50"\n        r={r}\n        className="stroke-primary transition-[stroke-dashoffset] duration-300"\n        strokeWidth={strokeWidth}\n        fill="none"\n        strokeLinecap="round"\n        strokeDasharray={`${dash} ${c}`}\n        transform="rotate(-90 50 50)"\n      />\n    </svg>\n  );\n}\n`,
  },
  {
    slug: "backlight-plate",
    exportName: "BacklightPlate",
    title: "Backlight Plate",
    demo: `(<BacklightPlate className="max-w-xs p-8"><p className="text-sm">Glow plate</p></BacklightPlate>)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\n\nexport type BacklightPlateProps = { children?: React.ReactNode; className?: string };\n\nexport function BacklightPlate({ children, className }: BacklightPlateProps) {\n  return (\n    <div data-slot="backlight-plate" className={cn("relative rounded-xl border border-border bg-card", className)}>\n      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/15 blur-2xl" aria-hidden />\n      {children}\n    </div>\n  );\n}\n`,
  },
  {
    slug: "glyph-matrix",
    exportName: "GlyphMatrix",
    title: "Glyph Matrix",
    demo: `(<GlyphMatrix className="h-40 w-full max-w-md rounded-lg border border-border text-primary/30" />)`,
    source: `"use client";\n\nimport * as React from "react";\nimport { cn } from "../../lib/utils";\nimport { useReducedMotion } from "../../motion/use-reduced-motion";\n\nconst GLYPHS = "アイウエオカキ0123456789";\n\nexport type GlyphMatrixProps = { className?: string; columns?: number; rows?: number };\n\nexport function GlyphMatrix({ className, columns = 24, rows = 10 }: GlyphMatrixProps) {\n  const reduce = useReducedMotion();\n  const cells = React.useMemo(\n    () =>\n      Array.from({ length: columns * rows }, (_, i) => ({\n        id: i,\n        ch: GLYPHS[i % GLYPHS.length]!,\n        delay: (i % 11) * 0.15,\n      })),\n    [columns, rows],\n  );\n  return (\n    <div\n      data-slot="glyph-matrix"\n      className={cn("grid overflow-hidden font-mono text-[10px] leading-none", className)}\n      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}\n    >\n      {cells.map((c) => (\n        <span key={c.id} className={cn(!reduce && "apolyx-glyph-flicker")} style={{ animationDelay: `${c.delay}s` }}>\n          {c.ch}\n        </span>\n      ))}\n    </div>\n  );\n}\n`,
  },
];

for (const c of BATCH) {
  c.title = c.title ?? c.exportName;
  emit(c);
}

// dock-bar, reveal-list extras
for (const extra of [
  {
    slug: "dock-bar",
    exportName: "DockBar",
    title: "Dock Bar",
    demo: `(<DockBar><DockItem><span className="text-lg">⌘</span></DockItem><DockItem><span className="text-lg">◎</span></DockItem></DockBar>)`,
    registryDeps: ["utils", "use-reduced-motion"],
    source: fs.readFileSync(path.join(uiDir, "dock-bar.tsx"), "utf8"),
  },
  {
    slug: "reveal-list",
    exportName: "RevealList",
    title: "Reveal List",
    demo: `(<RevealList className="space-y-2"><div className="rounded-md border border-border p-2 text-sm">One</div><div className="rounded-md border border-border p-2 text-sm">Two</div></RevealList>)`,
    source: fs.readFileSync(path.join(uiDir, "reveal-list.tsx"), "utf8"),
  },
]) {
  const reg = {
    $schema: "./schema.json",
    name: extra.slug,
    type: "ui",
    title: extra.title,
    description: `Apolyx S0012 — ${extra.title}`,
    dependencies: { motion: "^12.23.12" },
    files: [{ path: `src/components/ui/${extra.slug}.tsx`, target: `${extra.slug}.tsx` }],
    registryDependencies: extra.registryDeps ?? ["utils", "use-reduced-motion"],
    docs: `components/${extra.slug}`,
  };
  if (extra.slug === "dock-bar") {
    reg.files.push({ path: "src/components/ui/dock-bar.tsx", target: "dock-bar.tsx" });
  }
  fs.writeFileSync(path.join(registryDir, `${extra.slug}.json`), JSON.stringify(reg, null, 2) + "\n");
  const demo = `"use client";\n\nimport { ${extra.exportName}${extra.slug === "dock-bar" ? ", DockItem" : ""} } from "@altr/apolyx";\n\nexport default function Demo() {\n  return ${extra.demo};\n}\n`;
  fs.writeFileSync(path.join(demosDir, `${extra.slug}-demo.tsx`), demo);
  const mdx = `<ComponentPreview name="${extra.slug}-demo" />\n\n## Installation\n\n<InstallTabs name="${extra.slug}" exports="${extra.exportName}${extra.slug === "dock-bar" ? ", DockItem" : ""}" />\n`;
  fs.writeFileSync(path.join(mdxDir, `${extra.slug}.mdx`), mdx);
}

console.log(`B2 emitted ${BATCH.length} + dock/reveal docs`);