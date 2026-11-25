import { demos, type DemoName } from "@/demos";
import {
  allDocs,
  docHref,
  docsConfig,
  isKitSurface,
  type DocItem,
  type DocStatus,
} from "@/docs-config";

export type CatalogSection = "components" | "blocks" | "pages";

export type CatalogEntry = {
  id: string;
  title: string;
  description: string;
  section: CatalogSection;
  demo: DemoName;
  href: string;
  animated?: boolean;
  status?: DocStatus;
};

/** Surfaces whose demos are motion-led — shown with an Animated chip. */
const ANIMATED = new Set<string>([
  "activity-bars",
  "admit-pass",
  "avatar-group",
  "button-shiny",
  "confetti-card",
  "count-up-card",
  "creative-home-hero",
  "doc-stack",
  "fade-in",
  "flip-clock",
  "flip-text",
  "folder-card",
  "globe-arcs",
  "hero-chat",
  "hero-grid",
  "hero-pill",
  "hero-waitlist",
  "hover-lift",
  "launch-perks",
  "marquee-card",
  "metric-spark-card",
  "moodboard-generator",
  "popover",
  "pressable",
  "price-badge",
  "progress",
  "pulse-card",
  "qr-badge",
  "receipt-card",
  "sound-ring",
  "spinner",
  "stack-cards",
  "stagger",
  "stamp",
  "story-quote",
  "streaming-message",
  "swipe-deck",
  "text-highlight",
  "text-reveal",
  "text-swap",
  "the-shift",
  "thinking-bot",
  "thinking-ring",
  "thinking-sparkle",
  "thinking-wave",
  "toast",
  "voice-orb",
]);

const DEMO_ALIASES: Record<string, DemoName> = {
  "button-shiny": "button-shiny-demo",
};

function asDemo(name: string): DemoName | undefined {
  if (name in demos) return name as DemoName;
  return undefined;
}

/** Resolve the primary live demo for a docs slug. */
export function demoForSlug(slug: string): DemoName | undefined {
  const leaf = slug.includes("/") ? slug.slice(slug.lastIndexOf("/") + 1) : slug;
  if (DEMO_ALIASES[leaf]) return DEMO_ALIASES[leaf];
  return asDemo(`${leaf}-demo`);
}

function leafOf(slug: string) {
  return slug.includes("/") ? slug.slice(slug.lastIndexOf("/") + 1) : slug;
}

function fromDoc(item: DocItem, section: CatalogSection): CatalogEntry | null {
  const demo = demoForSlug(item.slug);
  if (!demo) return null;
  const leaf = leafOf(item.slug);
  return {
    id: item.slug,
    title: item.title,
    description: item.description,
    section,
    demo,
    href: docHref(item.slug),
    animated: ANIMATED.has(leaf),
    status: item.status,
  };
}

function componentEntries(): CatalogEntry[] {
  return allDocs.filter(isKitSurface).flatMap((item) => {
    const entry = fromDoc(item, "components");
    return entry ? [entry] : [];
  });
}

function blockEntriesFromDocs(): CatalogEntry[] {
  const group = docsConfig.find((g) => g.title === "Blocks");
  if (!group) return [];
  return group.items.flatMap((item) => {
    if (!item.slug.startsWith("blocks/")) return [];
    const entry = fromDoc(item, "blocks");
    return entry ? [entry] : [];
  });
}

/** Extra composed patterns that live under forms/docs rather than blocks/. */
const EXTRA_BLOCKS: Omit<CatalogEntry, "section">[] = [
  {
    id: "blocks/form-signup",
    title: "Signup form",
    description: "Email, password rules, and submit in one card.",
    demo: "form-signup-demo",
    href: "/docs/forms/patterns",
  },
  {
    id: "blocks/form-card",
    title: "Form card",
    description: "Card surface wrapping a labelled field set.",
    demo: "form-card-demo",
    href: "/docs/forms/patterns",
  },
  {
    id: "blocks/form-dialog",
    title: "Form dialog",
    description: "Modal create/edit flow with Field + Dialog.",
    demo: "form-dialog-demo",
    href: "/docs/forms/patterns",
  },
  {
    id: "blocks/form-sheet",
    title: "Form sheet",
    description: "Side drawer editor built from Sheet + Field.",
    demo: "form-sheet-demo",
    href: "/docs/forms/patterns",
  },
  {
    id: "blocks/composer",
    title: "Input composer",
    description: "Toolbar, attachments, and send in one Input Group.",
    demo: "input-group-composer-demo",
    href: "/docs/components/input-group",
  },
  {
    id: "blocks/switch-card-list",
    title: "Switch card list",
    description: "Notification channels as list rows with switches.",
    demo: "switch-card-list-demo",
    href: "/docs/components/switch",
  },
  {
    id: "blocks/switch-card-grid",
    title: "Switch card grid",
    description: "Preference tiles in a responsive card grid.",
    demo: "switch-card-grid-demo",
    href: "/docs/components/switch",
  },
  {
    id: "blocks/timeline-pipeline",
    title: "Pipeline timeline",
    description: "Stage pipeline composed from Timeline layouts.",
    demo: "timeline-pipeline-demo",
    href: "/docs/components/timeline",
    animated: true,
  },
  {
    id: "blocks/otp-verify",
    title: "OTP verify",
    description: "One-time code entry with resend chrome.",
    demo: "input-otp-verify-demo",
    href: "/docs/components/input-otp",
  },
  {
    id: "blocks/mask-billing",
    title: "Billing mask",
    description: "Card and expiry masks in a checkout block.",
    demo: "input-mask-billing-demo",
    href: "/docs/components/input-mask",
  },
];

/** Page-scale layouts — full screens / app shells. */
const PAGES: Omit<CatalogEntry, "section">[] = [
  {
    id: "pages/settings",
    title: "Settings",
    description: "Account preferences page composed from Field, Switch, and Card.",
    demo: "form-settings-demo",
    href: "/docs/forms/patterns",
  },
  {
    id: "pages/multi-step",
    title: "Multi-step onboarding",
    description: "Wizard flow with steps, validation, and progress.",
    demo: "form-multi-step-demo",
    href: "/docs/forms/patterns",
  },
  {
    id: "pages/conversation",
    title: "Agent conversation",
    description: "Full chat shell with composer, messages, and chrome.",
    demo: "conversation-shell-demo",
    href: "/docs/components/conversation-shell",
    animated: true,
  },
  {
    id: "pages/sign-in",
    title: "Sign in",
    description: "Email/password auth screen with OAuth buttons.",
    demo: "sign-in-demo",
    href: "/docs/blocks/sign-in",
    status: "new",
  },
  {
    id: "pages/dashboard-home",
    title: "Dashboard home",
    description: "Marketing dashboard preview chrome as a full page.",
    demo: "dashboard-home-demo",
    href: "/docs/blocks/dashboard-home",
    status: "new",
  },
  {
    id: "pages/creative-home",
    title: "Creative home",
    description: "Bold creative landing as a full-bleed page.",
    demo: "creative-home-hero-demo",
    href: "/docs/blocks/creative-home-hero",
    status: "new",
    animated: true,
  },
  {
    id: "pages/subscribe",
    title: "Subscribe",
    description: "Email capture with live join counter and avatars.",
    demo: "subscribe-field-demo",
    href: "/docs/components/subscribe-field",
    animated: true,
  },
];

function withSection(
  section: CatalogSection,
  items: Omit<CatalogEntry, "section">[],
): CatalogEntry[] {
  return items
    .filter((item) => item.demo in demos)
    .map((item) => ({ ...item, section }));
}

/** Docs blocks already cover sign-in / dashboard / creative — skip page dupes in Blocks. */
const PAGE_DEMO_IDS = new Set(PAGES.map((p) => p.demo));

export const catalogEntries: CatalogEntry[] = [
  ...componentEntries(),
  ...blockEntriesFromDocs().filter((e) => !PAGE_DEMO_IDS.has(e.demo)),
  ...withSection("blocks", EXTRA_BLOCKS),
  ...withSection("pages", PAGES),
];

export const CATALOG_SECTIONS: {
  id: CatalogSection;
  label: string;
  description: string;
}[] = [
  {
    id: "components",
    label: "Components",
    description: "Primitives and kit surfaces — open a card for docs and the live demo.",
  },
  {
    id: "blocks",
    label: "Blocks",
    description: "Composed sections that combine several components.",
  },
  {
    id: "pages",
    label: "Pages",
    description: "Page-scale layouts you can browse as starting points.",
  },
];

export function catalogCount(section?: CatalogSection) {
  if (!section) return catalogEntries.length;
  return catalogEntries.filter((e) => e.section === section).length;
}
