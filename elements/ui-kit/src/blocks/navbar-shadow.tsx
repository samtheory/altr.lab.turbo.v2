"use client";

import * as React from "react";
import { motion } from "motion/react";

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type NavbarShadowLink = {
  label: string;
  href: string;
};

export type NavbarShadowCta = {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export type NavbarShadowProps = {
  logo?: React.ReactNode;
  brand?: string;
  links?: NavbarShadowLink[];
  cta?: NavbarShadowCta;
  sticky?: boolean;
  className?: string;
};

const defaultLinks: NavbarShadowLink[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Blog", href: "#blog" },
];

const defaultCta: NavbarShadowCta = { label: "Get started", href: "#" };

function NavbarCta({ cta }: { cta: NavbarShadowCta }) {
  if (cta.href) {
    return (
      <Button
        size="sm"
        className="bg-primary text-primary-foreground shadow-md hover:bg-primary-hover"
        asChild
      >
        <a href={cta.href}>{cta.label}</a>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      className="bg-primary text-primary-foreground shadow-md hover:bg-primary-hover"
      onClick={cta.onClick}
    >
      {cta.label}
    </Button>
  );
}

/** Dark marketing navbar with a deep bottom shadow — logo, links, and CTA. */
export function NavbarShadow({
  logo,
  brand = "Apolyx",
  links = defaultLinks,
  cta = defaultCta,
  sticky = true,
  className,
}: NavbarShadowProps) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      data-slot="navbar-shadow"
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "w-full border-b border-border/50 bg-foreground text-background",
        "shadow-[0_12px_40px_-16px_color-mix(in_oklab,var(--foreground)_55%,transparent)]",
        sticky && "sticky top-0 z-50",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <a
          href="#"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md font-semibold tracking-tight",
            "text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-foreground",
          )}
        >
          {logo ?? (
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            >
              {brand.slice(0, 1)}
            </span>
          )}
          <span className="truncate font-display text-lg">{brand}</span>
        </a>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {links.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-background/75 transition-colors",
                "hover:text-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-foreground",
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <NavbarCta cta={cta} />
        </div>
      </div>
    </motion.header>
  );
}