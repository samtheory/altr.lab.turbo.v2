"use client";

import { Bell } from "lucide-react";
import { SwitchCard } from "@altr/apolyx";

export default function SwitchCardDemo() {
  return (
    <SwitchCard
      className="w-full max-w-sm"
      icon={<Bell />}
      title="Push notifications"
      description="Get alerts on this device when someone mentions you."
      defaultChecked
    />
  );
}
