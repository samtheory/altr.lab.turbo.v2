"use client";

import { Bell, Lock, Mail, Zap } from "lucide-react";
import { Grid, SwitchCard } from "@altr/apolyx";

const options = [
  { icon: Bell, title: "Push", description: "Alerts on your devices.", on: true },
  { icon: Mail, title: "Email digest", description: "One summary a day.", on: false },
  { icon: Zap, title: "Automations", description: "Run rules on new items.", on: true, tone: "success" as const },
  { icon: Lock, title: "Two-step login", description: "Ask for a code on sign-in.", on: false, tone: "warning" as const },
];

export default function SwitchCardGridDemo() {
  return (
    <Grid minItemWidth="14rem" className="w-full">
      {options.map((o) => (
        <SwitchCard
          key={o.title}
          icon={<o.icon />}
          title={o.title}
          description={o.description}
          defaultChecked={o.on}
          tone={o.tone}
        />
      ))}
    </Grid>
  );
}
