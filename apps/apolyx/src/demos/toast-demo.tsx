"use client";

import { Button, toast } from "@altr/apolyx";

export default function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() => toast("Event created", { description: "Sunday, 10:00" })}
      >
        Default
      </Button>
      <Button variant="outline" onClick={() => toast.success("Changes saved")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Upload failed")}>
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
            loading: "Publishing…",
            success: "Published",
            error: "Publish failed",
          })
        }
      >
        Promise
      </Button>
    </div>
  );
}
