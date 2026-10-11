"use client";

import * as React from "react";
import { Button, Card, CardContent, FadeIn } from "@altr/apolyx";

export default function FadeInDemo() {
  const [key, setKey] = React.useState(0);
  return (
    <div className="flex flex-col items-center gap-4">
      <FadeIn key={key}>
        <Card>
          <CardContent className="p-6 text-sm">Fades in and rises 16px.</CardContent>
        </Card>
      </FadeIn>
      <Button variant="outline" size="sm" onClick={() => setKey((k) => k + 1)}>
        Replay
      </Button>
    </div>
  );
}
