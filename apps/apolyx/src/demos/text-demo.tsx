"use client";

import { Heading, Text } from "@altr/apolyx";

export default function TextDemo() {
  return (
    <div className="max-w-md space-y-2">
      <Heading as="h3" size="lg">
        Release notes
      </Heading>
      <Text>Apolyx ships tokens, primitives, and components you own.</Text>
      <Text size="sm" tone="muted">
        Updated October 11, 2026
      </Text>
    </div>
  );
}
