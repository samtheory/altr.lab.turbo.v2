export type DocStatus = "stable" | "beta" | "new";

export type DocItem = {
  title: string;
  /** Path under /docs ("" is the introduction). */
  slug: string;
  description: string;
  status?: DocStatus;
};

export type DocGroup = {
  title: string;
  items: DocItem[];
};

const component = (
  name: string,
  title: string,
  description: string,
  status?: DocStatus,
): DocItem => ({ slug: `components/${name}`, title, description, status });

const block = (
  name: string,
  title: string,
  description: string,
  status?: DocStatus,
): DocItem => ({ slug: `blocks/${name}`, title, description, status });

export const docsConfig: DocGroup[] = [
  {
    title: "Getting started",
    items: [
      { slug: "", title: "Introduction", description: "What Apolyx is and how it is organised." },
      { slug: "installation", title: "Installation", description: "Monorepo workspace import or the apolyx CLI." },
      { slug: "theming", title: "Theming", description: "Three families × light / dark, tokens, and customization." },
      { slug: "cli", title: "CLI", description: "apolyx init, add, and list." },
    ],
  },
  {
    title: "Foundations",
    items: [
      { slug: "primitives", title: "Primitives", description: "Slot, Portal, Presence, FocusScope, DismissableLayer, RovingFocus, and friends." },
    ],
  },
  {
    title: "Components",
    items: [
      {
        slug: "components",
        title: "All components",
        description: "Browse the kit by category — open a card for docs, usage, and live playground.",
      },
      component("accordion", "Accordion", "Single and multiple disclosures with Collapsible."),
      component("alert", "Alert", "Inline status message with semantic variants."),
      component("avatar", "Avatar", "Image with a fallback that waits for load errors."),
      component("avatar-group", "Avatar Group", "Overlapping avatars with hover lift and overflow count.", "new"),
      component("avatar-status", "Avatar Status", "Avatar with a presence ring and status dot.", "new"),
      component("badge", "Badge", "Short status label."),
      component("button", "Button", "Actions with variants, sizes, loading, shiny, and status tones."),
      component("button-group", "Button Group", "Joined button and any widget, with an optional divider."),
      component("split-button", "Split Button", "Joined button whose icon opens a menu that grows from the trigger."),
      component("activity-bars", "Activity Bars", "Segmented activity columns with a goal line.", "new"),
      component("admit-pass", "Admit Pass", "Ticket-style pass with tilt and glare.", "new"),
      component("aurora-text", "Aurora Text", "Gradient aurora filled headline.", "new"),
      component("beam-link", "Beam Link", "Animated SVG connector between two points.", "new"),
      component("bento-grid", "Bento Grid", "Responsive bento layout grid and tiles.", "new"),
      component("blur-fade", "Blur Fade", "Blur and rise entrance animation.", "new"),
      component(
        "clip-video-text",
        "Clip Video Text",
        "Headline text masked with looping video.",
        "new",
      ),
      component("border-glow", "Border Glow", "Card with traveling conic border.", "new"),
      component("attachments", "Attachments", "Composer attachment chips.", "new"),
      component("card", "Card", "Surface with header, content, and footer."),
      component("cube-field", "Cube Field", "Cursor-ripple isometric cube grid background.", "new"),
      component("hover-boxes", "Hover Boxes", "Interactive box field that lights near the pointer.", "new"),
      component("mesh-gradient", "Mesh Gradient", "Soft animated mesh gradient plate.", "new"),
      component("wave-field", "Wave Field", "Layered sine-wave canvas background.", "new"),
      component("vortex-field", "Vortex Field", "Spiral particle vortex background.", "new"),
      component("lamp-glow", "Lamp Glow", "Top lamp wash for hero sections.", "new"),
      component("sparkle-field", "Sparkle Field", "Twinkling sparkle canvas background.", "new"),
      component("starfield", "Starfield", "Twinkling stars with shooting meteors.", "new"),
      component("confetti-card", "Confetti Card", "Celebration count with raining icon pills.", "new"),
      component("context-meter", "Context Meter", "Context-window usage meter.", "new"),
      component("conversation-shell", "Conversation Shell", "App frame for an agent chat with composer.", "new"),
      component("count-up-card", "Count Up Card", "Vertical metrics conveyor that swells at the focus line.", "new"),
      component("dialog", "Dialog", "Modal dialog with size presets, and AlertDialog."),
      component("diff-viewer", "Diff Viewer", "Unified diff panel for agent file edits.", "new"),
      component("doc-stack", "Doc Stack", "Stacked document card with fan-in profiles.", "new"),
      component("dropdown-menu", "Dropdown Menu", "Menu button with items, checkbox, and radio items."),
      component("empty-state", "Empty State", "Dashed empty surface with illustration, copy, and actions.", "new"),
      component("forge-loader", "Forge Loader", "Generative progress loader with cycling status.", "new"),
      component("float-nav", "Float Nav", "Scroll-hide floating pill navbar.", "new"),
      component("flip-clock", "Flip Clock", "Split-flap minutes and seconds clock.", "new"),
      component("flip-text", "Flip Text", "Letters that roll forward like cubes in a wave.", "new"),
      component("folder-card", "Folder Card", "Folder that opens on hover and fans out sheets.", "new"),
      component("glow-frame", "Glow Frame", "Soft bloom frame with optional traveling border.", "new"),
      component("globe-arcs", "Globe Arcs", "Dotted globe with animated city arcs.", "new"),
      component("hover-border", "Hover Border", "Rotating gradient border on hover.", "new"),
      component("kbd", "Kbd", "Keyboard key hint."),
      component("marquee", "Marquee", "Infinite horizontal or vertical scroll track.", "new"),
      component("marquee-card", "Marquee Card", "Alternating marquee tag rows above a short headline.", "new"),
      component("number-ticker", "Number Ticker", "Animated odometer number.", "new"),
      component("particle-field", "Particle Field", "Lightweight drifting particle canvas.", "new"),
      component(
        "particle-drift",
        "Particle Drift",
        "Depth-scaled parallax particle drift (2D canvas).",
        "new",
      ),
      component("pattern-dither", "Pattern Dither", "Ordered dither noise background.", "new"),
      component("pattern-dots", "Pattern Dots", "SVG dot pattern background.", "new"),
      component("pattern-flicker-grid", "Pattern Flicker Grid", "Random cell flicker grid.", "new"),
      component("pattern-hex", "Pattern Hex", "Honeycomb stroke pattern.", "new"),
      component("pattern-light-rays", "Pattern Light Rays", "Rotating radial light rays.", "new"),
      component("pattern-pulse-grid", "Pattern Pulse Grid", "Traveling highlight on a grid.", "new"),
      component("pattern-retro-grid", "Pattern Retro Grid", "Perspective retro floor grid.", "new"),
      component("pattern-ripple", "Pattern Ripple", "Expanding ripple rings.", "new"),
      component("pattern-stripes", "Pattern Stripes", "Diagonal stripe fill.", "new"),
      component("ripple-button", "Ripple Button", "Click ripple feedback button.", "new"),
      component("mega-nav", "Mega Nav", "Hover mega-menu marketing navbar.", "new"),
      component("mention-picker", "Mention Picker", "At-mention list for a chat composer.", "new"),
      component("app-sidebar", "App Sidebar", "Collapsible app sidebar with icon rail.", "new"),
      component("message-actions", "Message Actions", "Copy, regenerate, and feedback for a message.", "new"),
      component("metric-spark-card", "Metric Spark Card", "Metric tile with an animated SVG sparkline.", "new"),
      component("model-picker", "Model Picker", "Composer model switcher with reasoning effort.", "new"),
      component("pointer-follow", "Pointer Follow", "Labeled chip that follows the pointer.", "new"),
      component("popover", "Popover", "Interactive panel anchored to a trigger, with pop, slide, and fade motion."),
      component("price-badge", "Price Badge", "Price pill with glyph-by-glyph rolling animation and optional compare-at.", "new"),
      component("progress", "Progress", "Determinate and indeterminate progress bar."),
      component("pulse-card", "Pulse Card", "Heart-rate summary with animated ECG.", "new"),
      component("qr-badge", "QR Badge", "QR matrix that dissolves into a scan badge and grows back.", "new"),
      component("rag-sources", "RAG Sources", "Retrieved RAG chunks with scores.", "new"),
      component("reasoning-block", "Reasoning Block", "Collapsible chain-of-thought panel.", "new"),
      component("receipt-card", "Receipt Card", "Service receipt that prints line-by-line.", "new"),
      component("scroll-area", "Scroll Area", "Owned scrollport with token-styled scrollbars."),
      component("scroll-progress", "Scroll Progress", "Fixed viewport scroll progress bar.", "new"),
      component("shimmer-button", "Shimmer Button", "CTA with sliding highlight.", "new"),
      component("shimmer-text", "Shimmer Text", "Shimmering text sheen.", "new"),
      component("separator", "Separator", "Horizontal or vertical rule."),
      component("skeleton", "Skeleton", "Loading placeholder."),
      component("slash-menu", "Slash Menu", "Slash-command palette for a chat composer.", "new"),
      component("sound-ring", "Sound Ring", "Canvas ring of bars that pulses like an audio meter.", "new"),
      component("sources-list", "Sources List", "Cited sources under an assistant reply.", "new"),
      component("spinner", "Spinner", "Loading indicator with a screen-reader label."),
      component("stack-cards", "Stack Cards", "Cycling stack — front card drops and tucks behind.", "new"),
      component("spotlight-beam", "Spotlight Beam", "Page-scale top spotlight beam wash.", "new"),
      component("stamp", "Stamp", "Circle or square seal with orbiting caption and tick ring.", "new"),
      component("step-loader", "Step Loader", "Multi-step loading checklist with auto-advance.", "new"),
      component("story-quote", "Story Quote", "Testimonial quote with accent rise-in.", "new"),
      component("streaming-message", "Streaming Message", "Assistant message that streams word by word.", "new"),
      component("swipe-deck", "Swipe Deck", "Draggable swipe card deck.", "new"),
      component("tabs", "Tabs", "Tablist with automatic or manual activation."),
      component("task-checklist", "Task Checklist", "Agent task checklist with pending, running, done.", "new"),
      component("terminal-output", "Terminal Output", "Styled terminal log panel.", "new"),
      component("text", "Text", "Text and Heading typography scale."),
      component("text-highlight", "Text Highlight", "Marker that sweeps behind a phrase in view.", "new"),
      component("text-reveal", "Text Reveal", "Word or character blur-rise reveal.", "new"),
      component("typewriter-text", "Typewriter Text", "Character-by-character typing.", "new"),
      component("word-cycle", "Word Cycle", "Rotating headline word.", "new"),
      component("text-swap", "Text Swap", "Perspective 3D swap between two phrases.", "new"),
      component("thinking-bot", "Thinking Bot", "Bot avatar with bouncing dots.", "new"),
      component("thinking-ring", "Thinking Ring", "Breathing dot ring with shimmering status label.", "new"),
      component("thinking-sparkle", "Thinking Sparkle", "Soft pulsing sparkle with status copy.", "new"),
      component("thinking-wave", "Thinking Wave", "Equalizer-style thinking bars with a status label.", "new"),
      component("agent-handoff", "Agent Handoff", "Specialist transfer card with context payload.", "new"),
      component("agent-memory", "Agent Memory", "Expandable drawer of learned agent memory rules.", "new"),
      component("agent-question", "Agent Question", "Clarifying question with selectable options.", "new"),
      component("agent-timeline", "Agent Timeline", "Vertical timeline of agent run events.", "new"),
      component("artifact-panel", "Artifact Panel", "Collapsible list of generated files and links.", "new"),
      component("background-tasks", "Background Tasks", "Background jobs with progress and status.", "new"),
      component("browser-agent", "Browser Agent", "Browser automation URL bar and screenshot chrome.", "new"),
      component("checkpoint-rewind", "Checkpoint Rewind", "Session checkpoints with code or chat restore.", "new"),
      component("cost-tracker", "Cost Tracker", "Token and cost usage breakdown meter.", "new"),
      component("error-retry", "Error Retry", "Failed step card with retry and dismiss.", "new"),
      component("guardrail-check", "Guardrail Check", "Safety and policy verification before an agent runs.", "new"),
      component("mcp-servers", "MCP Servers", "MCP server list with connect toggles.", "new"),
      component("model-arena", "Model Arena", "Side-by-side model reply comparison.", "new"),
      component("oauth-consent", "OAuth Consent", "Permission card for connecting an agent to an app.", "new"),
      component("plan-review", "Plan Review", "Approve, edit, or reject an agent plan.", "new"),
      component("sandbox-preview", "Sandbox Preview", "Code sandbox preview frame with status.", "new"),
      component("scheduled-trigger", "Scheduled Trigger", "Cron trigger card with enable and next run.", "new"),
      component("secret-request", "Secret Request", "Masked input to supply an API key or secret.", "new"),
      component("sql-query-card", "SQL Query Card", "SQL query with a results table.", "new"),
      component("staged-action", "Staged Action", "Preview a staged side-effect before confirm.", "new"),
      component("sub-agents", "Sub Agents", "Parallel sub-agent lanes with status.", "new"),
      component("tool-approval", "Tool Approval", "Approve or deny an agent tool with side effects.", "new"),
      component("voice-agent", "Voice Agent", "Voice assistant card with start and end call.", "new"),
      component("voice-orb", "Voice Orb", "Pulsing orb driven by a 0–1 voice level.", "new"),
      component("timeline", "Timeline", "Chronological events with progress, tones, and four layouts."),
      component("toast", "Toast", "toast() API with an accessible Toaster region."),
      component("tool-call", "Tool Call", "Collapsible card for one agent tool call.", "new"),
      component("tooltip", "Tooltip", "Hover and focus hint with a shared delay."),
      component(
        "trace-waterfall",
        "Trace Waterfall",
        "Live agent span waterfall with playhead, nested kinds, errors, and a detail panel.",
        "new",
      ),
    ],
  },
  {
    title: "Blocks",
    items: [
      block("app-shelf", "App Shelf", "Horizontal shelf of app tiles.", "new"),
      block("creative-home-hero", "Creative Home Hero", "Bold creative landing hero.", "new"),
      block("dashboard-home", "Dashboard Home", "Marketing dashboard preview chrome.", "new"),
      block("design-results", "Design Results", "Masonry-ish design result cards.", "new"),
      block("hero-chat", "Hero Chat", "Hero with mini conversation preview.", "new"),
      block("hero-grid", "Hero Grid", "Hero on a blinking integrations grid.", "new"),
      block("hero-pill", "Hero Pill", "Centered hero with cycling headline pill.", "new"),
      block("hero-waitlist", "Hero Waitlist", "Hero with email join field.", "new"),
      block("launch-perks", "Launch Perks", "Launch offer perk chips.", "new"),
      block("leads-table", "Leads Table", "Presentational leads table.", "new"),
      block("moodboard-generator", "Moodboard Generator", "Palette swatches, prompt, and mood tiles.", "new"),
      block("pricing-tiers", "Pricing Tiers", "Three plans with monthly/annual toggle.", "new"),
      block("quote", "Quote", "Large testimonial quote block.", "new"),
      block("sign-in", "Sign In", "Email/password sign-in with OAuth buttons.", "new"),
      block("team", "Team", "Team member grid.", "new"),
      block("the-shift", "The Shift", "Before/after comparison section.", "new"),
      block("usage-card", "Usage Card", "Usage meter card with optional breakdown.", "new"),
    ],
  },
  {
    title: "Forms",
    items: [
      component("field", "Field", "Labelled field with top, floating, and inline layouts, FieldSet, and counters."),
      component("input", "Input", "Single-line text field with sizes, variants, and native types."),
      component("input-group", "Input Group", "Input or textarea with icons, text, buttons, and toolbars inside one box."),
      component("password-input", "Password Input", "Password field with a show / hide toggle and a strength meter."),
      component("password-rules", "Password Rules", "Password field with an animated requirement checklist and meter.", "new"),
      component("number-input", "Number Input", "Number field with steppers, keyboard stepping, clamping, and Intl formatting."),
      component("input-otp", "Input OTP", "One-time-code entry with paste, SMS autofill, patterns, PIN masking, and resend chrome.", "new"),
      component("input-mask", "Input Mask", "Format-as-you-type input for phones, dates, cards, and custom patterns."),
      component("subscribe-field", "Subscribe Field", "Email signup with a live avatar stack and rolling join counter.", "new"),
      component("dropzone", "Dropzone", "Drag-and-drop file upload with single or multi file lists and progress.", "new"),
      component("select", "Select", "Listbox select with keyboard, typeahead, and Field wiring."),
      component("combobox", "Combobox", "Searchable select with filter input and empty state."),
      component("textarea", "Textarea", "Multi-line text field with variants and auto-resize."),
      component("checkbox", "Checkbox", "Tri-state checkbox."),
      component("radio-group", "Radio Group", "Accessible radio group with roving focus."),
      component("switch", "Switch", "On / off toggle with a draggable, stretchy thumb, SwitchField, and SwitchCard."),
      component("label", "Label", "Accessible form label."),
      { slug: "forms/patterns", title: "Form patterns", description: "Layouts, containers, flows, and feedback composed from native forms and React 19 actions." },
    ],
  },
  {
    title: "Navigation",
    items: [
      component("breadcrumb", "Breadcrumb", "Path to the current page."),
      component("navigation-menu", "Navigation Menu", "Top navigation with hover-intent panels."),
      component("nav-list", "Nav List", "Vertical sidebar navigation."),
      component("pagination", "Pagination", "Accessible pagination chrome and page-range helper."),
      component("sheet", "Sheet", "Drawer from any edge — left / right sidebars."),
    ],
  },
  {
    title: "Data",
    items: [
      component("grid", "Grid", "Responsive CSS grid for cards and tiles."),
      component("list", "List", "Rows with leading, content, and trailing slots."),
      component("table", "Table", "Semantic data table with density and sticky header."),
      component(
        "data-grid",
        "DataGrid",
        "Virtualized grid with column ops, typed filters, and controlled views.",
      ),
    ],
  },
  {
    title: "Motion",
    items: [
      { slug: "motion", title: "Overview", description: "Motion tokens and reduced-motion rules." },
      { slug: "motion/fade-in", title: "FadeIn", description: "Opacity and rise entrance." },
      { slug: "motion/stagger", title: "Stagger", description: "Staggered list entrance." },
      { slug: "motion/pressable", title: "Pressable", description: "Press scale feedback." },
      { slug: "motion/hover-lift", title: "HoverLift", description: "Lift on hover for fine pointers." },
    ],
  },
  {
    title: "Charts",
    items: [
      { slug: "charts", title: "Overview", description: "ChartContainer, legend, tooltip, and config." },
      { slug: "charts/line-chart", title: "Line Chart", description: "Line and area series on visx scales." },
      { slug: "charts/bar-chart", title: "Bar Chart", description: "Grouped and stacked bars." },
    ],
  },
];

export const allDocs: DocItem[] = docsConfig.flatMap((g) => g.items);

/** Shippable kit surfaces — not guides, indexes, or pattern galleries. */
export function isKitSurface(item: DocItem): boolean {
  if (
    item.slug === "components" ||
    item.slug === "motion" ||
    item.slug === "charts" ||
    item.slug === "forms/patterns"
  ) {
    return false;
  }
  return (
    item.slug.startsWith("components/") ||
    item.slug.startsWith("motion/") ||
    item.slug.startsWith("charts/")
  );
}

export function kitSurfaceCount(group?: DocGroup): number {
  const items = group ? group.items : allDocs;
  return items.filter(isKitSurface).length;
}

export function findDoc(slug: string) {
  return allDocs.find((d) => d.slug === slug);
}

export function docHref(slug: string) {
  return slug ? `/docs/${slug}` : "/docs";
}

/** Content file (without extension) under src/content/docs. */
export function docFile(slug: string) {
  return slug || "index";
}

export function neighbours(slug: string) {
  const i = allDocs.findIndex((d) => d.slug === slug);
  return { prev: allDocs[i - 1], next: allDocs[i + 1] };
}
