import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bell, Lock, Mail, Moon, Sun, Zap } from "lucide-react";

import { FieldSet } from "./field-set";
import { Label } from "./label";
import { Switch, type SwitchTone } from "./switch";
import { SwitchCard, SwitchField } from "./switch-field";

const meta = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="s1" />
      <Label htmlFor="s1">Airplane mode</Label>
    </div>
  ),
};

function PhysicsDebug() {
  const [readout, setReadout] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    let raf = 0;
    const tick = () => {
      const thumbs = ref.current?.querySelectorAll<HTMLElement>('[data-slot="switch-thumb"]');
      const lines = Array.from(thumbs ?? []).map((t) => {
        const track = t.parentElement!;
        const progress = track.style.getPropertyValue("--switch-progress") || "0";
        return `${track.dataset.size}: transform=${t.style.transform || "none"} width=${t.style.width} progress=${progress}`;
      });
      setReadout(lines.join("\n"));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div ref={ref} className="grid gap-4">
      <p className="max-w-sm text-sm text-muted-foreground">
        Press and hold: the thumb stretches smoothly. Drag slowly: it never grows past 30%.
        Push past an end or into its resting side: it only squashes.
      </p>
      <div className="flex items-center gap-6">
        <Switch size="sm" aria-label="Small" />
        <Switch aria-label="Medium" defaultChecked />
        <Switch size="lg" aria-label="Large" />
      </div>
      <pre className="rounded-md bg-muted p-3 font-mono text-[11px] leading-relaxed">{readout}</pre>
    </div>
  );
}

export const Physics: Story = {
  name: "Physics (debug readout)",
  render: () => <PhysicsDebug />,
};

const tones: SwitchTone[] = ["primary", "success", "warning", "info", "destructive"];

export const Tones: Story = {
  render: () => (
    <div className="flex gap-4">
      {tones.map((tone) => (
        <Switch key={tone} tone={tone} defaultChecked aria-label={tone} />
      ))}
    </div>
  ),
};

export const Icons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Switch size="lg" aria-label="Dark mode" icons={{ checked: <Moon />, unchecked: <Sun /> }} />
      <Switch size="md" aria-label="Dark mode" defaultChecked icons={{ checked: <Moon />, unchecked: <Sun /> }} />
    </div>
  ),
};

export const Labels: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Switch size="lg" aria-label="Notifications" labels={{ checked: "On", unchecked: "Off" }} />
      <Switch size="md" aria-label="Visibility" tone="success" defaultChecked labels={{ checked: "Live", unchecked: "Draft" }} />
    </div>
  ),
};

export const Field: Story = {
  name: "SwitchField",
  render: () => (
    <div className="grid max-w-sm gap-5">
      <SwitchField label="Airplane mode" description="Turns off wireless connections." />
      <SwitchField side="start" label="Switch first" description="Switch on the start side." defaultChecked />
    </div>
  ),
};

const cards = [
  { icon: Bell, title: "Push", description: "Alerts on your devices.", on: true },
  { icon: Mail, title: "Email digest", description: "One summary a day.", on: false },
  { icon: Zap, title: "Automations", description: "Run rules on new items.", on: true },
  { icon: Lock, title: "Two-step login", description: "Ask for a code.", on: false },
];

export const CardGrid: Story = {
  name: "SwitchCard grid",
  render: () => (
    <div className="grid max-w-xl grid-cols-2 gap-3">
      {cards.map((c) => (
        <SwitchCard key={c.title} icon={<c.icon />} title={c.title} description={c.description} defaultChecked={c.on} />
      ))}
    </div>
  ),
};

export const SettingsPanel: Story = {
  render: () => (
    <FieldSet legend="Privacy" description="Control what others see." variant="framed" className="max-w-md">
      <SwitchField label="Show online status" defaultChecked />
      <SwitchField label="Read receipts" />
      <SwitchField label="Searchable profile" defaultChecked />
    </FieldSet>
  ),
};
