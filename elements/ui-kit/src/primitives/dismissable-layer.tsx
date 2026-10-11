"use client";

import * as React from "react";

import { composeRefs } from "./compose-refs";

type Layer = {
  node: HTMLElement;
  depth: number;
  seq: number;
  passive: boolean;
  disableOutsideDismiss: boolean;
  ignore: () => (HTMLElement | null)[];
  onDismiss: () => void;
};

const layers: Layer[] = [];
let seqCounter = 0;
let listening = false;

const LayerDepthContext = React.createContext(0);

/** Test-only: how many layers are currently registered. */
export function getDismissableLayerCount() {
  return layers.length;
}

function topFirst(list: Layer[]) {
  return [...list].sort((a, b) => b.depth - a.depth || b.seq - a.seq);
}

function isInside(layer: Layer, target: Node | null) {
  if (!target) return false;
  if (layer.node.contains(target)) return true;
  return layer.ignore().some((el) => el?.contains(target));
}

function ensureListeners() {
  if (listening || typeof document === "undefined") return;
  listening = true;

  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target as Node | null;
      const ordered = topFirst(layers);
      for (const layer of ordered) {
        if (layer.passive && !isInside(layer, target)) layer.onDismiss();
      }
      const top = ordered.find((layer) => !layer.passive);
      if (!top || top.disableOutsideDismiss || isInside(top, target)) return;
      top.onDismiss();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      const top = topFirst(layers)[0];
      if (!top) return;
      event.preventDefault();
      top.onDismiss();
    },
    true,
  );
}

export type DismissableLayerProps = React.HTMLAttributes<HTMLDivElement> & {
  onDismiss?: () => void;
  /** Sets `pointer-events: none` on body while mounted (modal surfaces). */
  disableOutsidePointerEvents?: boolean;
  /** Escape still dismisses; pointer-down outside does not. */
  disableOutsideDismiss?: boolean;
  /** Passive layers (tooltips) close on any outside pointer-down without blocking lower layers. */
  passive?: boolean;
  /** Elements treated as inside the layer (e.g. the trigger). */
  ignoreRefs?: React.RefObject<HTMLElement | null>[];
};

export const DismissableLayer = React.forwardRef<
  HTMLDivElement,
  DismissableLayerProps
>(function DismissableLayer(
  {
    onDismiss,
    disableOutsidePointerEvents = false,
    disableOutsideDismiss = false,
    passive = false,
    ignoreRefs,
    ...props
  },
  forwardedRef,
) {
  const ref = React.useRef<HTMLDivElement>(null);
  const depth = React.useContext(LayerDepthContext) + 1;
  const onDismissRef = React.useRef(onDismiss);
  const ignoreRefsRef = React.useRef(ignoreRefs);

  React.useEffect(() => {
    onDismissRef.current = onDismiss;
    ignoreRefsRef.current = ignoreRefs;
  });

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    ensureListeners();
    const entry: Layer = {
      node,
      depth,
      seq: ++seqCounter,
      passive,
      disableOutsideDismiss,
      ignore: () => (ignoreRefsRef.current ?? []).map((r) => r.current),
      onDismiss: () => onDismissRef.current?.(),
    };
    layers.push(entry);

    let previousPointer: string | null = null;
    if (disableOutsidePointerEvents) {
      previousPointer = document.body.style.pointerEvents;
      document.body.style.pointerEvents = "none";
    }
    node.style.pointerEvents = "auto";

    return () => {
      const idx = layers.indexOf(entry);
      if (idx >= 0) layers.splice(idx, 1);
      if (previousPointer !== null) {
        document.body.style.pointerEvents = previousPointer;
      }
    };
  }, [depth, passive, disableOutsideDismiss, disableOutsidePointerEvents]);

  return (
    <LayerDepthContext.Provider value={depth}>
      <div {...props} ref={composeRefs(ref, forwardedRef)} />
    </LayerDepthContext.Provider>
  );
});
