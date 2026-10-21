"use client";

import { ScrollArea, Text } from "@altr/apolyx";

export default function ScrollAreaDemo() {
  return (
    <ScrollArea className="h-40 w-72 rounded-lg border border-border p-3" aria-label="Tags">
      {Array.from({ length: 20 }, (_, i) => (
        <Text key={i} className="block py-1 text-sm">
          Tag row {i + 1}
        </Text>
      ))}
    </ScrollArea>
  );
}
