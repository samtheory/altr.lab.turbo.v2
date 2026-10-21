"use client";

import * as React from "react";
import { Progress, Text } from "@altr/apolyx";

export default function ProgressDemo() {
  const [value, setValue] = React.useState(35);
  React.useEffect(() => {
    const id = window.setInterval(() => {
      setValue((v) => (v >= 100 ? 10 : v + 8));
    }, 800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="grid w-72 gap-4">
      <div className="grid gap-2">
        <Text className="text-sm text-muted-foreground">Determinate — {value}%</Text>
        <Progress value={value} aria-label="Upload" />
      </div>
      <div className="grid gap-2">
        <Text className="text-sm text-muted-foreground">Indeterminate</Text>
        <Progress aria-label="Loading" />
      </div>
    </div>
  );
}
