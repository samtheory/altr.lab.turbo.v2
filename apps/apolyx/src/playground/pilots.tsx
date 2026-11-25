"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Progress,
  Separator,
  Skeleton,
  Spinner,
  Stamp,
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

export const cardPlayground: PlaygroundSchema = {
  id: "card-demo",
  component: "Card",
  installName: "card",
  docsPath: "/docs/components/card",
  controls: [
    { kind: "string", key: "title", label: "Title", placeholder: "Title" },
    { kind: "string", key: "description", label: "Description", placeholder: "Description" },
    { kind: "string", key: "label", label: "Field label", placeholder: "Name" },
    { kind: "string", key: "placeholder", label: "Placeholder", placeholder: "apolyx-docs" },
    { kind: "string", key: "primary", label: "Primary action", placeholder: "Create" },
    { kind: "boolean", key: "showCancel", label: "Show cancel" },
  ],
  defaults: {
    title: "Create project",
    description: "Deploy a new project in one click.",
    label: "Name",
    placeholder: "apolyx-docs",
    primary: "Create",
    showCancel: true,
  },
  render(values) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{str(values, "title", "Create project")}</CardTitle>
          <CardDescription>
            {str(values, "description", "Deploy a new project in one click.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="pg-card-project">{str(values, "label", "Name")}</Label>
          <Input
            id="pg-card-project"
            placeholder={str(values, "placeholder", "apolyx-docs")}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          {bool(values, "showCancel") ? <Button variant="ghost">Cancel</Button> : null}
          <Button>{str(values, "primary", "Create")}</Button>
        </CardFooter>
      </Card>
    );
  },
  toJsx(values) {
    const cancel = bool(values, "showCancel")
      ? `    <Button variant="ghost">Cancel</Button>\n`
      : "";
    return `<Card className="w-full max-w-sm">
  <CardHeader>
    <CardTitle>${str(values, "title")}</CardTitle>
    <CardDescription>${str(values, "description")}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-2">
    <Label htmlFor="card-project">${str(values, "label")}</Label>
    <Input id="card-project" placeholder=${JSON.stringify(str(values, "placeholder"))} />
  </CardContent>
  <CardFooter className="justify-end gap-2">
${cancel}    <Button>${str(values, "primary")}</Button>
  </CardFooter>
</Card>`;
  },
};

export const inputPlayground: PlaygroundSchema = {
  id: "input-demo",
  component: "Input",
  installName: "input",
  docsPath: "/docs/components/input",
  controls: [
    {
      kind: "enum",
      key: "variant",
      label: "Variant",
      options: ["outline", "filled", "underline", "ghost"].map((value) => ({ value, label: value })),
    },
    {
      kind: "enum",
      key: "size",
      label: "Size",
      options: ["sm", "md", "lg"].map((value) => ({ value, label: value })),
    },
    {
      kind: "enum",
      key: "shape",
      label: "Shape",
      options: ["default", "pill"].map((value) => ({ value, label: value })),
    },
    { kind: "string", key: "placeholder", label: "Placeholder", placeholder: "Email" },
    { kind: "boolean", key: "disabled", label: "Disabled" },
  ],
  defaults: {
    variant: "outline",
    size: "md",
    shape: "default",
    placeholder: "you@apolyx.dev",
    disabled: false,
  },
  render(values) {
    return (
      <Input
        className="max-w-sm"
        variant={str(values, "variant", "outline") as "outline"}
        size={str(values, "size", "md") as "md"}
        shape={str(values, "shape", "default") as "default"}
        placeholder={str(values, "placeholder")}
        disabled={bool(values, "disabled")}
      />
    );
  },
  toJsx(values) {
    const defaults = inputPlayground.defaults;
    return `<Input${attr("variant", str(values, "variant"), defaults)}${attr("size", str(values, "size"), defaults)}${attr("shape", str(values, "shape"), defaults)} placeholder=${JSON.stringify(str(values, "placeholder"))}${attr("disabled", bool(values, "disabled") || undefined)} />`;
  },
};

export const progressPlayground: PlaygroundSchema = {
  id: "progress-demo",
  component: "Progress",
  installName: "progress",
  docsPath: "/docs/components/progress",
  controls: [
    {
      kind: "enum",
      key: "mode",
      label: "Mode",
      options: [
        { value: "determinate", label: "determinate" },
        { value: "indeterminate", label: "indeterminate" },
      ],
    },
    { kind: "string", key: "value", label: "Value (0–100)", placeholder: "64" },
  ],
  defaults: { mode: "determinate", value: "64" },
  render(values) {
    const indeterminate = str(values, "mode") === "indeterminate";
    const raw = Number(str(values, "value", "64"));
    const value = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 0;
    return (
      <Progress
        className="w-full max-w-sm"
        value={indeterminate ? undefined : value}
        aria-label="Progress"
      />
    );
  },
  toJsx(values) {
    if (str(values, "mode") === "indeterminate") {
      return `<Progress className="w-full max-w-sm" aria-label="Progress" />`;
    }
    return `<Progress className="w-full max-w-sm" value={${Number(str(values, "value", "64")) || 0}} aria-label="Progress" />`;
  },
};

export const separatorPlayground: PlaygroundSchema = {
  id: "separator-demo",
  component: "Separator",
  installName: "separator",
  docsPath: "/docs/components/separator",
  controls: [
    {
      kind: "enum",
      key: "orientation",
      label: "Orientation",
      options: ["horizontal", "vertical"].map((value) => ({ value, label: value })),
    },
  ],
  defaults: { orientation: "horizontal" },
  render(values) {
    const vertical = str(values, "orientation") === "vertical";
    return (
      <div className={cnSep(vertical)}>
        <span className="text-sm text-muted-foreground">{vertical ? "A" : "Above"}</span>
        <Separator
          orientation={str(values, "orientation", "horizontal") as "horizontal"}
          className={vertical ? "h-10 self-center" : undefined}
        />
        <span className="text-sm text-muted-foreground">{vertical ? "B" : "Below"}</span>
      </div>
    );
  },
  toJsx(values) {
    return `<Separator${attr("orientation", str(values, "orientation"), separatorPlayground.defaults)} />`;
  },
};

function cnSep(vertical: boolean) {
  return vertical
    ? "flex h-16 items-center gap-3"
    : "flex w-full max-w-sm flex-col gap-3";
}

export const spinnerPlayground: PlaygroundSchema = {
  id: "spinner-demo",
  component: "Spinner",
  installName: "spinner",
  docsPath: "/docs/components/spinner",
  controls: [
    { kind: "string", key: "label", label: "Label", placeholder: "Loading" },
  ],
  defaults: { label: "Loading" },
  render(values) {
    return <Spinner label={str(values, "label", "Loading")} />;
  },
  toJsx(values) {
    const label = str(values, "label", "Loading");
    return label === "Loading"
      ? `<Spinner />`
      : `<Spinner label=${JSON.stringify(label)} />`;
  },
};

export const skeletonPlayground: PlaygroundSchema = {
  id: "skeleton-demo",
  component: "Skeleton",
  installName: "skeleton",
  docsPath: "/docs/components/skeleton",
  controls: [
    {
      kind: "enum",
      key: "shape",
      label: "Shape",
      options: [
        { value: "line", label: "line" },
        { value: "avatar", label: "avatar" },
        { value: "block", label: "block" },
      ],
    },
  ],
  defaults: { shape: "line" },
  render(values) {
    const shape = str(values, "shape", "line");
    if (shape === "avatar") return <Skeleton className="size-12 rounded-full" />;
    if (shape === "block") return <Skeleton className="h-24 w-full max-w-sm rounded-xl" />;
    return (
      <div className="grid w-full max-w-sm gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  },
  toJsx(values) {
    const shape = str(values, "shape", "line");
    if (shape === "avatar") return `<Skeleton className="size-12 rounded-full" />`;
    if (shape === "block") return `<Skeleton className="h-24 w-full rounded-xl" />`;
    return `<Skeleton className="h-4 w-full" />`;
  },
};

export const checkboxPlayground: PlaygroundSchema = {
  id: "checkbox-demo",
  component: "Checkbox",
  installName: "checkbox",
  docsPath: "/docs/components/checkbox",
  controls: [
    { kind: "boolean", key: "checked", label: "Checked" },
    { kind: "boolean", key: "disabled", label: "Disabled" },
    { kind: "string", key: "label", label: "Label", placeholder: "Accept terms" },
  ],
  defaults: { checked: true, disabled: false, label: "Accept terms" },
  render(values, setValue) {
    return (
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={bool(values, "checked")}
          disabled={bool(values, "disabled")}
          onCheckedChange={(checked) => setValue("checked", checked === true)}
        />
        {str(values, "label", "Accept terms")}
      </label>
    );
  },
  toJsx(values) {
    return `<label className="flex items-center gap-2 text-sm">
  <Checkbox${attr("checked", bool(values, "checked"))}${attr("disabled", bool(values, "disabled") || undefined)} />
  ${str(values, "label", "Accept terms")}
</label>`;
  },
};

export const stampPlayground: PlaygroundSchema = {
  id: "stamp-demo",
  component: "Stamp",
  installName: "stamp",
  docsPath: "/docs/components/stamp",
  controls: [
    {
      kind: "enum",
      key: "shape",
      label: "Shape",
      options: [
        { value: "circle", label: "circle" },
        { value: "square", label: "square" },
      ],
    },
    {
      kind: "enum",
      key: "variant",
      label: "Variant",
      options: [
        { value: "sale", label: "sale" },
        { value: "success", label: "success" },
        { value: "warning", label: "warning" },
        { value: "muted", label: "muted" },
        { value: "outline", label: "outline" },
      ],
    },
    { kind: "string", key: "label", label: "Center label", placeholder: "Sale" },
    { kind: "boolean", key: "showOrbit", label: "Orbit text" },
    {
      kind: "string",
      key: "orbit",
      label: "Orbit text",
      placeholder: "Save now on sale",
    },
    { kind: "boolean", key: "ring", label: "Tick ring" },
    {
      kind: "enum",
      key: "duration",
      label: "Orbit speed",
      options: [
        { value: "18", label: "fast" },
        { value: "28", label: "medium" },
        { value: "48", label: "slow" },
      ],
    },
  ],
  defaults: {
    shape: "circle",
    variant: "sale",
    label: "Sale",
    showOrbit: true,
    orbit: "Save now on sale",
    ring: true,
    duration: "28",
  },
  render(values) {
    const showOrbit = bool(values, "showOrbit");
    const duration = Number(str(values, "duration", "28")) || 28;
    return (
      <Stamp
        shape={str(values, "shape", "circle") as "circle" | "square"}
        variant={
          str(values, "variant", "sale") as
            | "sale"
            | "success"
            | "warning"
            | "muted"
            | "outline"
        }
        orbit={showOrbit ? str(values, "orbit", "Save now on sale") : false}
        ring={bool(values, "ring")}
        duration={duration}
      >
        {str(values, "label", "Sale")}
      </Stamp>
    );
  },
  toJsx(values) {
    const shape = str(values, "shape", "circle");
    const variant = str(values, "variant", "sale");
    const label = str(values, "label", "Sale");
    const showOrbit = bool(values, "showOrbit");
    const orbit = str(values, "orbit", "Save now on sale");
    const ring = bool(values, "ring");
    const duration = str(values, "duration", "28");
    const parts = [
      shape !== "circle" ? ` shape=${JSON.stringify(shape)}` : "",
      variant !== "sale" ? ` variant=${JSON.stringify(variant)}` : "",
      showOrbit
        ? orbit !== "Save now on sale"
          ? ` orbit=${JSON.stringify(orbit)}`
          : ""
        : " orbit={false}",
      ring ? "" : " ring={false}",
      duration !== "28" ? ` duration={${duration}}` : "",
    ].join("");
    return `<Stamp${parts}>${label}</Stamp>`;
  },
};
