"use client";
import { TaskChecklist } from "@altr/apolyx";
export default function Demo() {
  return (
    <div className="flex justify-center p-4">
      <TaskChecklist autoPlay />
    </div>
  );
}
