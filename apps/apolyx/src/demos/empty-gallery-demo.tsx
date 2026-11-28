"use client";

import { EmptyGallery, toast } from "@altr/apolyx";

export default function Demo() {
  return (
    <div className="flex w-full justify-center p-6">
      <EmptyGallery onAction={() => toast("Upload clicked")} />
    </div>
  );
}