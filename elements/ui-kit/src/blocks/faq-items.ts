export type FaqItem = {
  q: string;
  a: string;
};

export const defaultFaqItems: FaqItem[] = [
  {
    q: "How does Apolyx differ from a typical component library?",
    a: "Apolyx ships semantic tokens, motion-aware primitives, and marketing blocks without Radix or Base UI — you compose kit parts directly in product apps.",
  },
  {
    q: "Can I use these blocks in a Next.js app?",
    a: "Yes. Import from @altr/apolyx as client components. Blocks are self-contained and rely only on workspace kit dependencies.",
  },
  {
    q: "Is motion optional for accessibility?",
    a: "Every animated surface respects prefers-reduced-motion via useReducedMotion. Animations degrade to instant opacity or static layout when reduced motion is on.",
  },
  {
    q: "How do registry entries stay in sync?",
    a: "Each block has a registry JSON manifest under elements/ui-kit/registry with file paths, docs slug, and dependency hints for the Apolyx CLI.",
  },
  {
    q: "Do you support custom themes?",
    a: "Themes use CSS variables on :root. Power-blue and power-green variants extend the default token set without forking components.",
  },
];