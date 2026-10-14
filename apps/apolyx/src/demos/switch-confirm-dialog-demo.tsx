"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SwitchField,
  toast,
} from "@altr/apolyx";

export default function SwitchConfirmDialogDemo() {
  const [maintenance, setMaintenance] = React.useState(false);
  const [asking, setAsking] = React.useState(false);

  return (
    <>
      <SwitchField
        className="w-full max-w-sm"
        tone="warning"
        label="Maintenance mode"
        description="Visitors see a holding page."
        checked={maintenance}
        onCheckedChange={(next) => {
          // Turning on needs confirmation; turning off applies immediately.
          if (next) setAsking(true);
          else setMaintenance(false);
        }}
      />
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn on maintenance mode?</DialogTitle>
            <DialogDescription>The public site goes offline until you turn it back off.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setMaintenance(true);
                setAsking(false);
                toast.success("Maintenance mode is on");
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
