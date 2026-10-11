import * as React from "react";

type UseControllableStateParams<T> = {
  value?: T;
  defaultValue?: T;
  onChange?: (value: T) => void;
};

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateParams<T>) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue as T);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : uncontrolled;

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(current) : next;
      if (!isControlled) setUncontrolled(resolved);
      onChange?.(resolved);
    },
    [current, isControlled, onChange],
  );

  return [current, setValue] as const;
}
