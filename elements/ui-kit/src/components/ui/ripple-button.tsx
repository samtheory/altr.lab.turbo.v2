"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Button, type ButtonProps } from "./button";

export type RippleButtonProps = ButtonProps;

type Ripple = { x: number; y: number; id: number };

export function RippleButton({ className, onPointerDown, children, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const nextId = React.useRef(0);

  return (
    <Button
      data-slot="ripple-button"
      className={cn("relative overflow-hidden", className)}
      onPointerDown={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const id = nextId.current++;
        setRipples((r) => [
          ...r,
          { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
        ]);
        window.setTimeout(
          () => setRipples((r) => r.filter((x) => x.id !== id)),
          600,
        );
        onPointerDown?.(e);
      }}
      {...props}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute size-0 animate-[apolyx-ripple_0.6s_ease-out] rounded-full bg-primary-foreground/35"
          style={{ left: r.x, top: r.y, transform: "translate(-50%, -50%)" }}
          aria-hidden
        />
      ))}
      <span className="relative z-[1]">{children}</span>
    </Button>
  );
}