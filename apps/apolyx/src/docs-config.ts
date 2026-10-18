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
      component("alert", "Alert", "Inline status message with semantic variants."),
      component("avatar", "Avatar", "Image with a fallback that waits for load errors."),
      component("badge", "Badge", "Short status label."),
      component("button", "Button", "Actions with variants, sizes, loading, and asChild."),
      component("card", "Card", "Surface with header, content, and footer."),
      component("dialog", "Dialog", "Modal dialog with size presets, and AlertDialog."),
      component("dropdown-menu", "Dropdown Menu", "Menu button with items, checkbox, and radio items."),
      component("popover", "Popover", "Interactive panel anchored to a trigger, with pop, slide, and fade motion.", "new"),
      component("kbd", "Kbd", "Keyboard key hint."),
      component("separator", "Separator", "Horizontal or vertical rule."),
      component("skeleton", "Skeleton", "Loading placeholder."),
      component("spinner", "Spinner", "Loading indicator with a screen-reader label."),
      component("tabs", "Tabs", "Tablist with automatic or manual activation."),
      component("text", "Text", "Text and Heading typography scale."),
      component("timeline", "Timeline", "Chronological events with progress, tones, and four layouts.", "new"),
      component("toast", "Toast", "toast() API with an accessible Toaster region."),
      component("tooltip", "Tooltip", "Hover and focus hint with a shared delay."),
    ],
  },
  {
    title: "Forms",
    items: [
      component("field", "Field", "Labelled field with top, floating, and inline layouts, FieldSet, and counters."),
      component("input", "Input", "Single-line text field with sizes, variants, and native types."),
      component("input-group", "Input Group", "Input or textarea with icons, text, buttons, and toolbars inside one box.", "new"),
      component("password-input", "Password Input", "Password field with a show / hide toggle and a strength meter.", "new"),
      component("number-input", "Number Input", "Number field with steppers, keyboard stepping, clamping, and Intl formatting.", "new"),
      component("input-otp", "Input OTP", "One-time-code entry with paste, SMS autofill, patterns, and PIN masking.", "new"),
      component("input-mask", "Input Mask", "Format-as-you-type input for phones, dates, cards, and custom patterns.", "new"),
      component("textarea", "Textarea", "Multi-line text field with variants and auto-resize."),
      component("checkbox", "Checkbox", "Tri-state checkbox."),
      component("switch", "Switch", "On / off toggle with a draggable, stretchy thumb, SwitchField, and SwitchCard.", "new"),
      component("label", "Label", "Accessible form label."),
      { slug: "forms/patterns", title: "Form patterns", description: "Layouts, containers, flows, and feedback composed from native forms and React 19 actions.", status: "new" },
    ],
  },
  {
    title: "Navigation",
    items: [
      component("breadcrumb", "Breadcrumb", "Path to the current page.", "new"),
      component("navigation-menu", "Navigation Menu", "Top navigation with hover-intent panels.", "new"),
      component("nav-list", "Nav List", "Vertical sidebar navigation.", "new"),
      component("sheet", "Sheet", "Drawer from any edge — left / right sidebars.", "new"),
    ],
  },
  {
    title: "Data",
    items: [
      component("grid", "Grid", "Responsive CSS grid for cards and tiles.", "new"),
      component("list", "List", "Rows with leading, content, and trailing slots.", "new"),
      component("table", "Table", "Semantic data table with density and sticky header.", "new"),
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
