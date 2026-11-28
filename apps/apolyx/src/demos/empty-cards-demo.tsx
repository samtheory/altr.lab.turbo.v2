"use client";

import { EmptyCards, toast } from "@altr/apolyx";

export default function Demo() {
  return (
    <div className="flex w-full justify-center p-6">
      <EmptyCards onAction={() => toast("New card")} />
    </div>
  );
}