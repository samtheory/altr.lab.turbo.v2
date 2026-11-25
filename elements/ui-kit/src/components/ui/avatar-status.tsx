"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage, type AvatarProps } from "./avatar";

const statusDot = cva(
  "absolute bottom-0 right-0 rounded-full ring-2 ring-background transition-transform duration-200",
  {
    variants: {
      status: {
        online: "bg-success",
        offline: "bg-muted-foreground/50",
        busy: "bg-destructive",
        away: "bg-warning",
      },
      size: {
        sm: "size-2",
        md: "size-2.5",
        lg: "size-3",
      },
    },
    defaultVariants: {
      status: "online",
      size: "md",
    },
  },
);

const frameSize = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

export type AvatarStatusProps = AvatarProps &
  VariantProps<typeof statusDot> & {
    src?: string;
    alt?: string;
    fallback?: React.ReactNode;
    /** Soft pulse on the online status. */
    pulse?: boolean;
  };

/** Avatar with a presence status dot (and optional pulse for online). */
export function AvatarStatus({
  status = "online",
  size = "md",
  src,
  alt,
  fallback,
  pulse = true,
  className,
  children,
  ...props
}: AvatarStatusProps) {
  const dim = size ?? "md";
  return (
    <span data-slot="avatar-status" className={cn("relative inline-flex shrink-0", className)}>
      <Avatar className={cn(frameSize[dim])} {...props}>
        {children ?? (
          <>
            {src ? <AvatarImage src={src} alt={alt ?? ""} /> : null}
            <AvatarFallback>{fallback}</AvatarFallback>
          </>
        )}
      </Avatar>
      <span
        aria-hidden
        data-status={status ?? undefined}
        className={cn(
          statusDot({ status, size: dim }),
          pulse && status === "online" && "animate-pulse motion-reduce:animate-none",
        )}
      />
      <span className="sr-only">Status: {status}</span>
    </span>
  );
}
