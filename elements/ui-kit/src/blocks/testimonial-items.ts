export type TestimonialBlockItem = {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  avatar?: string;
  image?: string;
};

export const defaultTestimonialItems: TestimonialBlockItem[] = [
  {
    quote:
      "We shipped a cohesive product UI in weeks — motion, charts, and agent chrome included.",
    name: "Morgan Hayes",
    role: "VP Product",
    company: "Northline",
  },
  {
    quote: "Apolyx let us keep brand semantics without fighting the design system.",
    name: "Alex Kim",
    role: "Design lead",
    company: "Relay",
  },
  {
    quote: "Our marketing pages finally match the product — one token stack, no drift.",
    name: "Jordan Lee",
    role: "Founder",
    company: "Patchwork",
  },
  {
    quote: "Reduced-motion paths are first-class; accessibility review was painless.",
    name: "Riley Park",
    role: "Engineering",
    company: "OpenForm",
  },
];

export const testimonialImageTints = [
  "color-mix(in oklch, var(--primary) 28%, var(--muted))",
  "color-mix(in oklch, var(--info) 24%, var(--muted))",
  "color-mix(in oklch, var(--success) 22%, var(--muted))",
  "color-mix(in oklch, var(--warning) 20%, var(--muted))",
];

export function testimonialSubtitle(item: TestimonialBlockItem) {
  const parts = [item.role, item.company].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export function testimonialInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function testimonialHandle(item: TestimonialBlockItem) {
  const sub = testimonialSubtitle(item);
  return sub ? `@${item.name.split(" ")[0]?.toLowerCase()}` : undefined;
}