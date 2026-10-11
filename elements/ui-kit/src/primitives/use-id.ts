import * as React from "react";

export function useId(deterministicId?: string) {
  const generated = React.useId();
  return deterministicId ?? generated;
}
