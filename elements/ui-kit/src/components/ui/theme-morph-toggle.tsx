"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";
import { useReducedMotion } from "../../motion/use-reduced-motion";

export type ThemeMorphToggleProps = {
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

export function ThemeMorphToggle({
  className,
  size = "icon",
  variant = "outline",
}: ThemeMorphToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const reduce = useReducedMotion();

  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant={variant} size={size} className={cn(className)} disabled aria-label="Toggle theme">
        <Sun className="size-4" />
      </Button>
    );
  }

  const dark = resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("relative overflow-hidden", className)}
      aria-label={dark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "sun" : "moon"}
          initial={reduce ? false : { opacity: 0, rotate: -40, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, rotate: 40, scale: 0.6 }}
          transition={{ duration: 0.2 }}
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}