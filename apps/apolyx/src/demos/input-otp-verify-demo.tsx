"use client";

import * as React from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  Spinner,
  toast,
} from "@altr/apolyx";

const CORRECT = "424242";
const RESEND_SECONDS = 30;

type Status = "idle" | "verifying" | "invalid" | "verified";

export default function InputOTPVerifyDemo() {
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [wait, setWait] = React.useState(RESEND_SECONDS);

  React.useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const verify = (value: string) => {
    if (status === "verifying") return;
    setStatus("verifying");
    window.setTimeout(() => {
      if (value === CORRECT) {
        setStatus("verified");
        toast.success("Phone verified");
      } else {
        setStatus("invalid");
        toast.error("That code didn't work");
      }
    }, 900);
  };

  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify(code);
        }}
      >
        <CardHeader>
          <CardTitle>Check your phone</CardTitle>
          <CardDescription>
            Enter the code we sent to •••• 0199. Try <span className="font-mono">{CORRECT}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field
            label="Verification code"
            error={status === "invalid" ? "Wrong code. Check the message and try again." : undefined}
          >
            <InputOTP
              maxLength={6}
              name="code"
              value={code}
              tone={status === "verified" ? "success" : "default"}
              disabled={status === "verifying" || status === "verified"}
              onValueChange={(v) => {
                setCode(v);
                if (status === "invalid") setStatus("idle");
              }}
              onComplete={verify}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </Field>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button type="submit" disabled={code.length < 6 || status === "verifying" || status === "verified"}>
            {status === "verifying" ? <Spinner label="Verifying" /> : null}
            {status === "verified" ? "Verified" : status === "verifying" ? "Verifying…" : "Verify"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Didn&apos;t get it?{" "}
            {wait > 0 ? (
              <span className="tabular-nums">Resend in {wait}s</span>
            ) : (
              <button
                type="button"
                className="font-medium text-primary underline-offset-4 hover:underline"
                onClick={() => {
                  setWait(RESEND_SECONDS);
                  setCode("");
                  setStatus("idle");
                  toast("New code sent");
                }}
              >
                Resend code
              </button>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
