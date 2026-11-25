"use client";
import { MessageActions } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex justify-center p-8">
      <MessageActions text="Hello from Apolyx" onRegenerate={() => {}} onFeedback={() => {}} />
    </div>
  );
}
