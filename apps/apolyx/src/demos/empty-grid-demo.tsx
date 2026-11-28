"use client";

import { EmptyGrid, toast } from "@altr/apolyx";

export default function Demo() {
  return (
    <div className="flex w-full justify-center p-6">
      <EmptyGrid onAction={() => toast("Add item")} />
    </div>
  );
}