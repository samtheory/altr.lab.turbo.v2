import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T | null) {
  if (typeof ref === "function") {
    const cleanup = ref(value);
    if (typeof cleanup === "function") {
      return cleanup;
    }
    return;
  }
  if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

export function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T | null) => {
    const cleanups = refs
      .map((ref) => setRef(ref, node))
      .filter((fn): fn is () => void => typeof fn === "function");
    if (cleanups.length) {
      return () => {
        for (const cleanup of cleanups) cleanup();
        for (const ref of refs) setRef(ref, null);
      };
    }
  };
}

export function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}
