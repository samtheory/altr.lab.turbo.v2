/** Emit registry + apolyx docs for existing src/components/ui/<slug>.tsx */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apolyxRoot = path.resolve(kitRoot, "../../apps/apolyx");
const uiDir = path.join(kitRoot, "src/components/ui");
const registryDir = path.join(kitRoot, "registry");
const demosDir = path.join(apolyxRoot, "src/demos");
const mdxDir = path.join(apolyxRoot, "src/content/docs/components");

const META = {
  "dock-bar": { exportName: "DockBar", title: "Dock Bar", extraExports: ", DockItem", demo: `(<DockBar><DockItem><span>⌘</span></DockItem></DockBar>)` },
  "reveal-list": { exportName: "RevealList", title: "Reveal List", demo: `(<RevealList className="space-y-2"><div className="rounded-md border p-2 text-sm">Item</div></RevealList>)` },
  "browser-frame": { exportName: "BrowserFrame", title: "Browser Frame", demo: `(<BrowserFrame url="apolyx.dev"><div className="flex h-32 items-center justify-center text-sm">Preview</div></BrowserFrame>)` },
  "phone-frame": { exportName: "PhoneFrame", title: "Phone Frame", demo: `(<PhoneFrame><div className="flex h-64 items-center justify-center text-sm">App</div></PhoneFrame>)` },
  "android-frame": { exportName: "AndroidFrame", title: "Android Frame", demo: `(<AndroidFrame><div className="flex h-64 items-center justify-center text-sm">App</div></AndroidFrame>)` },
  "social-quote-card": { exportName: "SocialQuoteCard", title: "Social Quote Card", demo: `(<SocialQuoteCard name="Apolyx" handle="@apolyx" text="Ship with taste." />)` },
  "orbit-ring": { exportName: "OrbitRing", title: "Orbit Ring", demo: `(<OrbitRing className="size-36"><span className="flex size-7 items-center justify-center rounded-full border bg-card text-xs">A</span></OrbitRing>)` },
  "magnify-lens": { exportName: "MagnifyLens", title: "Magnify Lens", demo: `(<MagnifyLens className="max-w-xs"><div className="h-28 rounded-lg bg-muted" /></MagnifyLens>)` },
  "cursor-glow": { exportName: "CursorGlow", title: "Cursor Glow", demo: `(<CursorGlow className="h-32 rounded-xl border"><p className="p-4 text-sm text-muted-foreground">Move pointer</p></CursorGlow>)` },
  "edge-fade-blur": { exportName: "EdgeFadeBlur", title: "Edge Fade Blur", demo: `(<EdgeFadeBlur className="h-28 overflow-y-auto border rounded-lg p-3 text-sm"><p>Scrollable</p><p className="mt-16">End</p></EdgeFadeBlur>)` },
  "dot-map": { exportName: "DotMap", title: "Dot Map", demo: `(<DotMap className="h-24 text-primary/35" />)` },
  "shine-frame": { exportName: "ShineFrame", title: "Shine Frame", demo: `(<ShineFrame><div className="p-6 text-sm">Framed</div></ShineFrame>)` },
  "spotlight-card": { exportName: "SpotlightCard", title: "Spotlight Card", demo: `(<SpotlightCard className="max-w-xs p-6 text-sm">Hover</SpotlightCard>)` },
  "glare-surface": { exportName: "GlareSurface", title: "Glare Surface", demo: `(<GlareSurface className="rounded-xl p-8">Glare</GlareSurface>)` },
  "meteor-shower": { exportName: "MeteorShower", title: "Meteor Shower", demo: `(<MeteorShower className="h-36 w-full max-w-md rounded-xl border" />)` },
  "gradient-glow-card": { exportName: "GradientGlowCard", title: "Gradient Glow Card", demo: `(<GradientGlowCard className="max-w-xs p-6 text-sm">Glow</GradientGlowCard>)` },
  "confetti-burst": { exportName: "ConfettiBurst", title: "Confetti Burst", demo: `(<ConfettiBurst active className="relative h-28 w-full max-w-md border rounded-xl" />)` },
  "theme-morph-toggle": { exportName: "ThemeMorphToggle", title: "Theme Morph Toggle", demo: `(<ThemeMorphToggle />)` },
  "text-motion": { exportName: "TextMotion", title: "Text Motion", demo: `(<TextMotion preset="rise" className="text-xl font-semibold">Motion</TextMotion>)` },
  "line-shadow-text": { exportName: "LineShadowText", title: "Line Shadow Text", demo: `(<LineShadowText className="text-4xl font-bold">Shadow</LineShadowText>)` },
  "gradient-flow-text": { exportName: "GradientFlowText", title: "Gradient Flow Text", demo: `(<GradientFlowText className="text-3xl font-semibold">Flow</GradientFlowText>)` },
  "scramble-text": { exportName: "ScrambleText", title: "Scramble Text", demo: `(<ScrambleText text="Apolyx" className="font-mono text-lg" />)` },
  "scroll-velocity-text": { exportName: "ScrollVelocityText", title: "Scroll Velocity Text", demo: `(<ScrollVelocityText className="text-xl font-semibold">Velocity</ScrollVelocityText>)` },
  "sparkle-text": { exportName: "SparkleText", title: "Sparkle Text", demo: `(<SparkleText className="text-2xl font-semibold">Sparkle</SparkleText>)` },
  "morph-text": { exportName: "MorphText", title: "Morph Text", demo: `(<MorphText items={["Ship", "Polish", "Repeat"]} className="text-lg" />)` },
  "spin-label": { exportName: "SpinLabel", title: "Spin Label", demo: `(<SpinLabel text="ORBIT • " className="size-28 text-[9px] uppercase text-muted-foreground" />)` },
  "comic-text": { exportName: "ComicText", title: "Comic Text", demo: `(<ComicText className="text-3xl">Pow!</ComicText>)` },
  "kinetic-text": { exportName: "KineticText", title: "Kinetic Text", demo: `(<KineticText text="Wave" className="text-xl font-semibold" />)` },
  "file-tree": { exportName: "FileTree", title: "File Tree", demo: `(<FileTree items={[{ name: "src", children: [{ name: "index.ts" }] }]} />)` },
  "pixel-reveal": { exportName: "PixelReveal", title: "Pixel Reveal", demo: `(<PixelReveal className="h-24 w-full max-w-sm" revealed={0.55} />)` },
  "pulse-button": { exportName: "PulseButton", title: "Pulse Button", demo: `(<PulseButton>Go</PulseButton>)` },
  "magnet-button": { exportName: "MagnetButton", title: "Magnet Button", demo: `(<MagnetButton>Magnet</MagnetButton>)` },
  "progress-ring": { exportName: "ProgressRing", title: "Progress Ring", demo: `(<ProgressRing value={72} className="size-24" />)` },
  "backlight-plate": { exportName: "BacklightPlate", title: "Backlight Plate", demo: `(<BacklightPlate className="p-8 text-sm">Plate</BacklightPlate>)` },
  "glyph-matrix": { exportName: "GlyphMatrix", title: "Glyph Matrix", demo: `(<GlyphMatrix className="h-32 w-full max-w-lg border rounded-lg" />)` },
};

for (const [slug, m] of Object.entries(META)) {
  const tsx = path.join(uiDir, slug + ".tsx");
  if (!fs.existsSync(tsx)) {
    console.warn("skip (no tsx):", slug);
    continue;
  }
  const exports = m.exportName + (m.extraExports ?? "");
  const reg = {
    $schema: "./schema.json",
    name: slug,
    type: "ui",
    title: m.title,
    description: "Apolyx S0012 — " + m.title,
    dependencies: { motion: "^12.23.12" },
    files: [{ path: "src/components/ui/" + slug + ".tsx", target: slug + ".tsx" }],
    registryDependencies: ["utils", "use-reduced-motion"],
    docs: "components/" + slug,
  };
  fs.writeFileSync(path.join(registryDir, slug + ".json"), JSON.stringify(reg, null, 2) + "\n");
  const imports = m.extraExports
    ? 'import { DockBar, DockItem } from "@altr/apolyx";'
    : 'import { ' + m.exportName + ' } from "@altr/apolyx";';
  const demoFixed = slug === "dock-bar" ? imports : 'import { ' + exports.split(",")[0].trim() + (slug === "dock-bar" ? ", DockItem" : "") + ' } from "@altr/apolyx";';
  const demo =
    '"use client";\n\n' +
    (slug === "dock-bar"
      ? 'import { DockBar, DockItem } from "@altr/apolyx";\n\nexport default function Demo() { return ' +
        m.demo +
        "; }\n"
      : 'import { ' + m.exportName + ' } from "@altr/apolyx";\n\nexport default function Demo() { return ' + m.demo + "; }\n");
  fs.writeFileSync(path.join(demosDir, slug + "-demo.tsx"), demo);
  fs.writeFileSync(
    path.join(mdxDir, slug + ".mdx"),
  `<ComponentPreview name="${slug}-demo" />\n\n## Installation\n\n<InstallTabs name="${slug}" exports="${exports}" />\n`,
  );
}
console.log("docs-only done");