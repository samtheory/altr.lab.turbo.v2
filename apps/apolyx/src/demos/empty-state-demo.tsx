"use client";

import { Upload } from "lucide-react";
import { EmptyState, toast } from "@altr/apolyx";

export default function EmptyStateDemo() {
  return (
    <EmptyState
      title="No files yet"
      description="Upload a file or drag one here to get started."
      actionLabel="Upload file"
      actionIcon={Upload}
      secondaryActionLabel={null}
      onAction={() => toast("Upload clicked")}
    />
  );
}
