"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

type AvatarContextValue = {
  imageStatus: "idle" | "loading" | "loaded" | "error";
  setImageStatus: (s: AvatarContextValue["imageStatus"]) => void;
};

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

export type AvatarProps = React.HTMLAttributes<HTMLSpanElement> & {
  ref?: React.Ref<HTMLSpanElement>;
};

export function Avatar({ className, ref, ...props }: AvatarProps) {
  const [imageStatus, setImageStatus] =
    React.useState<AvatarContextValue["imageStatus"]>("idle");

  return (
    <AvatarContext.Provider value={{ imageStatus, setImageStatus }}>
      <span
        ref={ref}
        data-slot="avatar"
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  );
}

export type AvatarImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  ref?: React.Ref<HTMLImageElement>;
};

export function AvatarImage({
  className,
  ref,
  onLoad,
  onError,
  ...props
}: AvatarImageProps) {
  const ctx = React.useContext(AvatarContext);
  React.useEffect(() => {
    ctx?.setImageStatus("loading");
  }, [ctx, props.src]);

  if (ctx?.imageStatus === "error") return null;

  return (
    <img
      ref={ref}
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      onLoad={(e) => {
        ctx?.setImageStatus("loaded");
        onLoad?.(e);
      }}
      onError={(e) => {
        ctx?.setImageStatus("error");
        onError?.(e);
      }}
      {...props}
    />
  );
}

export type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement> & {
  delayMs?: number;
  ref?: React.Ref<HTMLSpanElement>;
};

export function AvatarFallback({
  className,
  delayMs = 0,
  ref,
  ...props
}: AvatarFallbackProps) {
  const ctx = React.useContext(AvatarContext);
  const [canShow, setCanShow] = React.useState(delayMs === 0);

  React.useEffect(() => {
    if (delayMs === 0) return;
    const t = window.setTimeout(() => setCanShow(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);

  if (!canShow) return null;
  if (ctx?.imageStatus === "loaded") return null;

  return (
    <span
      ref={ref}
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
