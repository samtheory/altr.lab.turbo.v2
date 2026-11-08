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
      component("accordion", "Accordion", "Single and multiple disclosures with Collapsible.", "new"),
      component("alert", "Alert", "Inline status message with semantic variants."),
      component("avatar", "Avatar", "Image with a fallback that waits for load errors."),
      component("badge", "Badge", "Short status label."),
      component("button", "Button", "Actions with variants, sizes, loading, shiny, and status tones.", "new"),
      component("button-group", "Button Group", "Joined button and any widget, with an optional divider.", "new"),
      component("split-button", "Split Button", "Joined button whose icon opens a menu that grows from the trigger.", "new"),
      component("card", "Card", "Surface with header, content, and footer."),
      component("dialog", "Dialog", "Modal dialog with size presets, and AlertDialog."),
      component("dropdown-menu", "Dropdown Menu", "Menu button with items, checkbox, and radio items."),
      component("popover", "Popover", "Interactive panel anchored to a trigger, with pop, slide, and fade motion."),
      component("kbd", "Kbd", "Keyboard key hint."),
      component("progress", "Progress", "Determinate and indeterminate progress bar.", "new"),
      component("scroll-area", "Scroll Area", "Owned scrollport with token-styled scrollbars.", "new"),
      component("separator", "Separator", "Horizontal or vertical rule."),
      component("skeleton", "Skeleton", "Loading placeholder."),
      component("spinner", "Spinner", "Loading indicator with a screen-reader label."),
      component("tabs", "Tabs", "Tablist with automatic or manual activation."),
      component("text", "Text", "Text and Heading typography scale."),
      component("timeline", "Timeline", "Chronological events with progress, tones, and four layouts."),
      component("toast", "Toast", "toast() API with an accessible Toaster region."),
      component("tooltip", "Tooltip", "Hover and focus hint with a shared delay."),
    ],
  },
  {
    title: "Forms",
    items: [
      component("field", "Field", "Labelled field with top, floating, and inline layouts, FieldSet, and counters."),
      component("input", "Input", "Single-line text field with sizes, variants, and native types."),
      component("input-group", "Input Group", "Input or textarea with icons, text, buttons, and toolbars inside one box."),
      component("password-input", "Password Input", "Password field with a show / hide toggle and a strength meter."),
      component("number-input", "Number Input", "Number field with steppers, keyboard stepping, clamping, and Intl formatting."),
      component("input-otp", "Input OTP", "One-time-code entry with paste, SMS autofill, patterns, and PIN masking."),
      component("input-mask", "Input Mask", "Format-as-you-type input for phones, dates, cards, and custom patterns."),
      component("select", "Select", "Listbox select with keyboard, typeahead, and Field wiring.", "new"),
      component("combobox", "Combobox", "Searchable select with filter input and empty state.", "new"),
      component("textarea", "Textarea", "Multi-line text field with variants and auto-resize."),
      component("checkbox", "Checkbox", "Tri-state checkbox."),
      component("radio-group", "Radio Group", "Accessible radio group with roving focus.", "new"),
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
      component("pagination", "Pagination", "Accessible pagination chrome and page-range helper.", "new"),
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
        "new",
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
