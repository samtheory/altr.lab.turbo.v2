"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Switch,
} from "@altr/apolyx";

import type { PlaygroundSchema, PlaygroundValues } from "./types";

function str(values: PlaygroundValues, key: string, fallback = "") {
  const v = values[key];
  return typeof v === "string" ? v : fallback;
}

function bool(values: PlaygroundValues, key: string) {
  return Boolean(values[key]);
}

function attr(
  key: string,
  value: string | boolean | undefined,
  defaults?: Record<string, string | boolean>,
) {
  if (value === undefined) return "";
  if (defaults && defaults[key] === value) return "";
  if (typeof value === "boolean") {
    return value ? ` ${key}={true}` : "";
  }
  return ` ${key}=${JSON.stringify(value)}`;
}

export const buttonPlayground: PlaygroundSchema = {
  id: "button-demo",
  component: "Button",
  installName: "button",
  docsPath: "/docs/components/button",
  controls: [
    {
      kind: "enum",
      key: "variant",
      label: "Variant",
      options: [
        "default",
        "secondary",
        "outline",
        "ghost",
        "destructive",
        "link",
        "shiny",
      ].map((value) => ({ value, label: value })),
    },
    {
      kind: "enum",
      key: "size",
      label: "Size",
      options: ["xs", "sm", "md", "lg"].map((value) => ({ value, label: value })),
    },
    { kind: "boolean", key: "loading", label: "Loading" },
    { kind: "boolean", key: "disabled", label: "Disabled" },
    { kind: "string", key: "label", label: "Label", placeholder: "Button" },
  ],
  defaults: {
    variant: "default",
    size: "md",
    loading: false,
    disabled: false,
    label: "Save changes",
  },
  render(values) {
    return (
      <Button
        variant={str(values, "variant", "default") as "default"}
        size={str(values, "size", "md") as "md"}
        loading={bool(values, "loading")}
        disabled={bool(values, "disabled")}
      >
        {str(values, "label", "Save changes")}
      </Button>
    );
  },
  toJsx(values) {
    const defaults = buttonPlayground.defaults;
    return `<Button${attr("variant", str(values, "variant"), defaults)}${attr("size", str(values, "size"), defaults)}${attr("loading", bool(values, "loading") || undefined)}${attr("disabled", bool(values, "disabled") || undefined)}>
  ${str(values, "label", "Save changes")}
</Button>`;
  },
};

export const badgePlayground: PlaygroundSchema = {
  id: "badge-demo",
  component: "Badge",
  installName: "badge",
  docsPath: "/docs/components/badge",
  controls: [
    {
      kind: "enum",
      key: "variant",
      label: "Variant",
      options: [
        "default",
        "secondary",
        "outline",
        "success",
        "warning",
        "info",
        "destructive",
      ].map((value) => ({ value, label: value })),
    },
    { kind: "string", key: "label", label: "Label", placeholder: "Badge" },
  ],
  defaults: { variant: "default", label: "New" },
  render(values) {
    return (
      <Badge variant={str(values, "variant", "default") as "default"}>
        {str(values, "label", "New")}
      </Badge>
    );
  },
  toJsx(values) {
    return `<Badge${attr("variant", str(values, "variant"), badgePlayground.defaults)}>
  ${str(values, "label", "New")}
</Badge>`;
  },
};

export const alertPlayground: PlaygroundSchema = {
  id: "alert-demo",
  component: "Alert",
  installName: "alert",
  docsPath: "/docs/components/alert",
  controls: [
    {
      kind: "enum",
      key: "variant",
      label: "Variant",
      options: ["default", "success", "warning", "info", "destructive"].map((value) => ({
        value,
        label: value,
      })),
    },
    { kind: "string", key: "title", label: "Title", placeholder: "Title" },
    {
      kind: "string",
      key: "description",
      label: "Description",
      placeholder: "Description",
    },
  ],
  defaults: {
    variant: "default",
    title: "Heads up",
    description: "Deploys pause during the maintenance window.",
  },
  render(values) {
    return (
      <Alert
        variant={str(values, "variant", "default") as "default"}
        className="w-full max-w-md"
      >
        <AlertTitle>{str(values, "title", "Heads up")}</AlertTitle>
        <AlertDescription>
          {str(values, "description", "Deploys pause during the maintenance window.")}
        </AlertDescription>
      </Alert>
    );
  },
  toJsx(values) {
    return `<Alert${attr("variant", str(values, "variant"), alertPlayground.defaults)}>
  <AlertTitle>${str(values, "title")}</AlertTitle>
  <AlertDescription>${str(values, "description")}</AlertDescription>
</Alert>`;
  },
};

export const switchPlayground: PlaygroundSchema = {
  id: "switch-demo",
  component: "Switch",
  installName: "switch",
  docsPath: "/docs/components/switch",
  controls: [
    {
      kind: "enum",
      key: "size",
      label: "Size",
      options: ["sm", "md", "lg"].map((value) => ({ value, label: value })),
    },
    {
      kind: "enum",
      key: "tone",
      label: "Tone",
      options: ["primary", "success", "warning", "info", "destructive"].map((value) => ({
        value,
        label: value,
      })),
    },
    { kind: "boolean", key: "checked", label: "Checked" },
    { kind: "boolean", key: "disabled", label: "Disabled" },
  ],
  defaults: {
    size: "md",
    tone: "primary",
    checked: true,
    disabled: false,
  },
  render(values, setValue) {
    return (
      <Switch
        size={str(values, "size", "md") as "md"}
        tone={str(values, "tone", "primary") as "primary"}
        checked={bool(values, "checked")}
        disabled={bool(values, "disabled")}
        onCheckedChange={(checked) => setValue("checked", checked)}
        aria-label="Playground switch"
      />
    );
  },
  toJsx(values) {
    const defaults = switchPlayground.defaults;
    return `<Switch${attr("size", str(values, "size"), defaults)}${attr("tone", str(values, "tone"), defaults)}${attr("checked", bool(values, "checked"))}${attr("disabled", bool(values, "disabled") || undefined)} aria-label="Notifications" />`;
  },
};
