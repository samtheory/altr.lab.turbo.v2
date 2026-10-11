"use client";

import * as React from "react";

import { composeRefs } from "./compose-refs";

type AnyProps = Record<string, unknown>;

function mergeProps(slotProps: AnyProps, childProps: AnyProps) {
  const override: AnyProps = { ...childProps };

  for (const propName of Object.keys(slotProps)) {
    const slotValue = slotProps[propName];
    const childValue = childProps[propName];

    if (propName === "style") {
      override.style = {
        ...(slotValue as React.CSSProperties | undefined),
        ...(childValue as React.CSSProperties | undefined),
      };
      continue;
    }

    if (propName === "className") {
      override.className = [slotValue, childValue].filter(Boolean).join(" ");
      continue;
    }

    if (/^on[A-Z]/.test(propName)) {
      override[propName] = (...args: unknown[]) => {
        if (typeof childValue === "function") {
          (childValue as (...a: unknown[]) => void)(...args);
        }
        const event = args[0] as { defaultPrevented?: boolean } | undefined;
        if (event?.defaultPrevented) return;
        if (typeof slotValue === "function") {
          (slotValue as (...a: unknown[]) => void)(...args);
        }
      };
      continue;
    }

    if (childValue === undefined) {
      override[propName] = slotValue;
    }
  }

  return override;
}

export type SlotProps = React.HTMLAttributes<HTMLElement> & {
  children?: React.ReactNode;
  ref?: React.Ref<HTMLElement>;
};

export function Slot({ children, ref, ...props }: SlotProps) {
  if (React.isValidElement(children)) {
    const child = children as React.ReactElement & {
      ref?: React.Ref<HTMLElement>;
    };
    return React.cloneElement(child, {
      ...mergeProps(props as AnyProps, child.props as AnyProps),
      ref: composeRefs(ref, child.ref),
    } as never);
  }

  if (React.Children.count(children) > 1) {
    throw new Error("Apolyx Slot expects a single React element child.");
  }

  return null;
}

export function Slottable({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
