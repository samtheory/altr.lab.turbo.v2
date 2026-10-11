"use client";

import * as React from "react";

import { composeRefs } from "./compose-refs";
import { useControllableState } from "./use-controllable-state";

type Orientation = "horizontal" | "vertical";

type RovingFocusContextValue = {
  currentTabStopId: string | null;
  onItemFocus: (id: string) => void;
  onItemShiftTab: () => void;
  orientation: Orientation;
  loop: boolean;
  register: (id: string, disabled: boolean, el: HTMLElement | null) => void;
};

const RovingFocusContext = React.createContext<RovingFocusContextValue | null>(
  null,
);

export type RovingFocusGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: Orientation;
  loop?: boolean;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

export function RovingFocusGroup({
  orientation = "horizontal",
  loop = true,
  value,
  defaultValue,
  onValueChange,
  onKeyDown,
  ...props
}: RovingFocusGroupProps) {
  const [currentTabStopId, setCurrentTabStopId] = useControllableState<
    string | null
  >({
    value: value ?? undefined,
    defaultValue: defaultValue ?? null,
    onChange: (v) => {
      if (v != null) onValueChange?.(v);
    },
  });

  const items = React.useRef(
    new Map<string, { disabled: boolean; el: HTMLElement | null }>(),
  );

  const register = React.useCallback(
    (id: string, disabled: boolean, el: HTMLElement | null) => {
      if (!el) {
        items.current.delete(id);
        return;
      }
      items.current.set(id, { disabled, el });
      if (currentTabStopId == null && !disabled) setCurrentTabStopId(id);
    },
    [currentTabStopId, setCurrentTabStopId],
  );

  const focusByIndex = (ids: string[], index: number) => {
    const id = ids[index];
    const item = id ? items.current.get(id) : undefined;
    item?.el?.focus();
    if (id) setCurrentTabStopId(id);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    const ids = Array.from(items.current.entries())
      .filter(([, v]) => !v.disabled)
      .map(([id]) => id);
    if (!ids.length) return;
    const currentIndex = Math.max(0, ids.indexOf(currentTabStopId ?? ""));
    const nextKeys =
      orientation === "horizontal"
        ? ["ArrowRight", "ArrowLeft"]
        : ["ArrowDown", "ArrowUp"];
    const [nextKey, prevKey] = nextKeys;

    if (event.key === nextKey) {
      event.preventDefault();
      const next = currentIndex + 1;
      if (next < ids.length) focusByIndex(ids, next);
      else if (loop) focusByIndex(ids, 0);
    } else if (event.key === prevKey) {
      event.preventDefault();
      const prev = currentIndex - 1;
      if (prev >= 0) focusByIndex(ids, prev);
      else if (loop) focusByIndex(ids, ids.length - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusByIndex(ids, 0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusByIndex(ids, ids.length - 1);
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      const char = event.key.toLowerCase();
      const start = currentIndex + 1;
      const ordered = [...ids.slice(start), ...ids.slice(0, start)];
      const match = ordered.find((id) => {
        const text = items.current.get(id)?.el?.textContent?.trim().toLowerCase();
        return text?.startsWith(char);
      });
      if (match) focusByIndex(ids, ids.indexOf(match));
    }
  };

  const ctx = React.useMemo<RovingFocusContextValue>(
    () => ({
      currentTabStopId,
      onItemFocus: setCurrentTabStopId,
      onItemShiftTab: () => {},
      orientation,
      loop,
      register,
    }),
    [currentTabStopId, setCurrentTabStopId, orientation, loop, register],
  );

  return (
    <RovingFocusContext.Provider value={ctx}>
      <div role="group" {...props} onKeyDown={handleKeyDown} />
    </RovingFocusContext.Provider>
  );
}

export type RovingFocusItemProps = React.HTMLAttributes<HTMLElement> & {
  /** Key inside the group (not the DOM id). */
  id: string;
  /** Optional DOM id for the rendered button. */
  domId?: string;
  disabled?: boolean;
};

export const RovingFocusItem = React.forwardRef<
  HTMLButtonElement,
  RovingFocusItemProps
>(function RovingFocusItem(
  { id, domId, disabled = false, onFocus, onKeyDown, ...props },
  forwardedRef,
) {
  const ctx = React.useContext(RovingFocusContext);
  if (!ctx) throw new Error("RovingFocusItem must be used in RovingFocusGroup");
  const ref = React.useRef<HTMLButtonElement>(null);
  const tabIndex = ctx.currentTabStopId === id ? 0 : -1;

  React.useEffect(() => {
    ctx.register(id, disabled, ref.current);
    return () => ctx.register(id, disabled, null);
  }, [ctx, id, disabled]);

  return (
    <button
      type="button"
      {...props}
      id={domId}
      ref={composeRefs(ref, forwardedRef)}
      tabIndex={disabled ? -1 : tabIndex}
      disabled={disabled}
      data-disabled={disabled ? "" : undefined}
      onFocus={(e) => {
        ctx.onItemFocus(id);
        onFocus?.(e);
      }}
      onKeyDown={onKeyDown}
    />
  );
});
