import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apolyxRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/apolyx");

const SLUGS = [
  ["dock-bar", "DockBarDemo", "DockBar"],
  ["reveal-list", "RevealListDemo", "RevealList"],
  ["browser-frame", "BrowserFrameDemo", "BrowserFrame"],
  ["phone-frame", "PhoneFrameDemo", "PhoneFrame"],
  ["android-frame", "AndroidFrameDemo", "AndroidFrame"],
  ["social-quote-card", "SocialQuoteCardDemo", "SocialQuoteCard"],
  ["orbit-ring", "OrbitRingDemo", "OrbitRing"],
  ["magnify-lens", "MagnifyLensDemo", "MagnifyLens"],
  ["cursor-glow", "CursorGlowDemo", "CursorGlow"],
  ["edge-fade-blur", "EdgeFadeBlurDemo", "EdgeFadeBlur"],
  ["dot-map", "DotMapDemo", "DotMap"],
  ["shine-frame", "ShineFrameDemo", "ShineFrame"],
  ["spotlight-card", "SpotlightCardDemo", "SpotlightCard"],
  ["glare-surface", "GlareSurfaceDemo", "GlareSurface"],
  ["meteor-shower", "MeteorShowerDemo", "MeteorShower"],
  ["gradient-glow-card", "GradientGlowCardDemo", "GradientGlowCard"],
  ["confetti-burst", "ConfettiBurstDemo", "ConfettiBurst"],
  ["theme-morph-toggle", "ThemeMorphToggleDemo", "ThemeMorphToggle"],
  ["text-motion", "TextMotionDemo", "TextMotion"],
  ["line-shadow-text", "LineShadowTextDemo", "LineShadowText"],
  ["gradient-flow-text", "GradientFlowTextDemo", "GradientFlowText"],
  ["scramble-text", "ScrambleTextDemo", "ScrambleText"],
  ["scroll-velocity-text", "ScrollVelocityTextDemo", "ScrollVelocityText"],
  ["sparkle-text", "SparkleTextDemo", "SparkleText"],
  ["morph-text", "MorphTextDemo", "MorphText"],
  ["spin-label", "SpinLabelDemo", "SpinLabel"],
  ["comic-text", "ComicTextDemo", "ComicText"],
  ["kinetic-text", "KineticTextDemo", "KineticText"],
  ["file-tree", "FileTreeDemo", "FileTree"],
  ["pixel-reveal", "PixelRevealDemo", "PixelReveal"],
  ["pulse-button", "PulseButtonDemo", "PulseButton"],
  ["magnet-button", "MagnetButtonDemo", "MagnetButton"],
  ["progress-ring", "ProgressRingDemo", "ProgressRing"],
  ["backlight-plate", "BacklightPlateDemo", "BacklightPlate"],
  ["glyph-matrix", "GlyphMatrixDemo", "GlyphMatrix"],
];

const DOCS = [
  ["android-frame", "Android Frame", "Android device chrome shell."],
  ["backlight-plate", "Backlight Plate", "Rear glow presentation plate."],
  ["browser-frame", "Browser Frame", "Desktop browser chrome shell."],
  ["comic-text", "Comic Text", "Comic balloon display type."],
  ["confetti-burst", "Confetti Burst", "Standalone confetti particle burst."],
  ["cursor-glow", "Cursor Glow", "Pointer spotlight in a region."],
  ["dock-bar", "Dock Bar", "Magnifying icon dock bar."],
  ["dot-map", "Dot Map", "SVG world dot map."],
  ["edge-fade-blur", "Edge Fade Blur", "Progressive edge fade masks."],
  ["file-tree", "File Tree", "Collapsible file tree."],
  ["glare-surface", "Glare Surface", "Reusable glare hover overlay."],
  ["glyph-matrix", "Glyph Matrix", "Matrix-style glyph field."],
  ["gradient-flow-text", "Gradient Flow Text", "Animated gradient text fill."],
  ["gradient-glow-card", "Gradient Glow Card", "Neon gradient border card."],
  ["kinetic-text", "Kinetic Text", "Per-letter kinetic bounce."],
  ["line-shadow-text", "Line Shadow Text", "Offset line shadow typography."],
  ["magnet-button", "Magnet Button", "Magnetic hover CTA button."],
  ["magnify-lens", "Magnify Lens", "Hover magnifier lens."],
  ["meteor-shower", "Meteor Shower", "Falling meteor streaks."],
  ["morph-text", "Morph Text", "Crossfade between strings."],
  ["orbit-ring", "Orbit Ring", "Orbiting icon ring decoration."],
  ["phone-frame", "Phone Frame", "iOS-style device shell."],
  ["pixel-reveal", "Pixel Reveal", "Pixelated image reveal grid."],
  ["progress-ring", "Progress Ring", "Circular determinate progress ring."],
  ["pulse-button", "Pulse Button", "Breathing scale CTA button."],
  ["reveal-list", "Reveal List", "Animated list enter and exit."],
  ["scramble-text", "Scramble Text", "Decode scramble headline."],
  ["scroll-velocity-text", "Scroll Velocity Text", "Scroll-speed skew text."],
  ["shine-frame", "Shine Frame", "Conic shine border frame."],
  ["social-quote-card", "Social Quote Card", "Social post quote card."],
  ["sparkle-text", "Sparkle Text", "Sparkles on headline text."],
  ["spin-label", "Spin Label", "Circular spin label path."],
  ["spotlight-card", "Spotlight Card", "Mouse-tracking spotlight card."],
  ["text-motion", "Text Motion", "Preset text entrance motion."],
  ["theme-morph-toggle", "Theme Morph Toggle", "Animated theme icon morph."],
];

const demosPath = path.join(apolyxRoot, "src/demos/index.ts");
let demos = fs.readFileSync(demosPath, "utf8");

for (const [slug, ident] of SLUGS.map((s) => [s[0], s[1]])) {
  const line = `import ${ident} from "./${slug}-demo";`;
  if (!demos.includes(line)) {
    demos = demos.replace(
      "import BlurFadeDemo from \"./blur-fade-demo\";",
      "import BlurFadeDemo from \"./blur-fade-demo\";\n" + line,
    );
  }
  const key = `  "${slug}-demo": ${ident},`;
  if (!demos.includes(key)) {
    demos = demos.replace(
      '  "blur-fade-demo": BlurFadeDemo,',
      `  "blur-fade-demo": BlurFadeDemo,\n${key}`,
    );
  }
}
fs.writeFileSync(demosPath, demos);

const configPath = path.join(apolyxRoot, "src/docs-config.ts");
let config = fs.readFileSync(configPath, "utf8");
for (const [slug, title, desc] of DOCS) {
  const needle = `component("${slug}"`;
  if (!config.includes(needle)) {
    const insert = `      component("${slug}", "${title}", "${desc}", "new"),\n`;
    config = config.replace(
      '      component("border-glow", "Border Glow", "Card with traveling conic border.", "new"),\n',
      '      component("border-glow", "Border Glow", "Card with traveling conic border.", "new"),\n' + insert,
    );
  }
}
fs.writeFileSync(configPath, config);
console.log("patched demos + docs-config");