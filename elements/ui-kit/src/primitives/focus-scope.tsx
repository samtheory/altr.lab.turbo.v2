"use client";

import * as React from "react";

import { composeRefs } from "./compose-refs";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE),
  ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);
}

export type FocusScopeProps = React.HTMLAttributes<HTMLDivElement> & {
  trapped?: boolean;
  autoFocus?: boolean;
  restoreFocus?: boolean;
};

export const FocusScope = React.forwardRef<HTMLDivElement, FocusScopeProps>(
  function FocusScope(
    {
      trapped = true,
      autoFocus = true,
      restoreFocus = true,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) {
    const ref = React.useRef<HTMLDivElement>(null);
    const previouslyFocused = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      if (autoFocus) {
        const first = ref.current ? getFocusable(ref.current)[0] : null;
        first?.focus();
      }
      return () => {
        if (restoreFocus) previouslyFocused.current?.focus?.();
      };
    }, [autoFocus, restoreFocus]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (!trapped || event.key !== "Tab" || !ref.current) return;
      const items = getFocusable(ref.current);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    return (
      <div
        {...props}
        ref={composeRefs(ref, forwardedRef)}
        onKeyDown={handleKeyDown}
      />
    );
  },
);
