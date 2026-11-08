"use client";

import * as React from "react";
import {
  CircleDashed,
  CircleX,
  Clock,
  RefreshCw,
  Send,
  TriangleAlert,
  CircleCheck,
} from "lucide-react";

import { Button, buttonTones, type ButtonProps, type ButtonTone } from "./button";

const statusGlyph: Record<ButtonTone, React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  pending: TriangleAlert,
  progress: CircleDashed,
  submitted: Send,
  review: RefreshCw,
  success: CircleCheck,
  failed: CircleX,
  expired: Clock,
};

export const statusLabels: Record<ButtonTone, string> = {
  pending: "Pending",
  progress: "In progress",
  submitted: "Submitted",
  review: "In review",
  success: "Success",
  failed: "Failed",
  expired: "Expired",
};

export type StatusButtonProps = Omit<ButtonProps, "variant" | "tone"> & {
  tone: ButtonTone;
  /** `status` is the tinted face. `status-inset` draws that face color as an inner border. */
  variant?: "status" | "status-inset";
};

/** Status chip from the tone set. Pass children to replace the default label. */
export function StatusButton({
  tone,
  variant = "status",
  size = "sm",
  children,
  ...props
}: StatusButtonProps) {
  const Icon = statusGlyph[tone];
  return (
    <Button variant={variant} tone={tone} size={size} {...props}>
      <Icon aria-hidden />
      {children ?? statusLabels[tone]}
    </Button>
  );
}

export { buttonTones };
