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
  PasswordInput,
  PasswordStrength,
  defaultPasswordRules,
  toast,
} from "@altr/apolyx";

export default function PasswordNewFormDemo() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const strongEnough = defaultPasswordRules.every((r) => r.test(password));
  const canSubmit = strongEnough && confirm === password;
  return (
    <Card className="w-full max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("Password updated");
          setPassword("");
          setConfirm("");
        }}
      >
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>Use a password you don't use anywhere else.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Current password">
            <PasswordInput name="current" autoComplete="current-password" required />
          </Field>
          <div className="grid gap-2">
            <Field label="New password">
              <PasswordInput
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <PasswordStrength value={password} variant="both" />
          </div>
          <Field
            label="Confirm new password"
            error={confirm && confirm !== password ? "Passwords don't match." : undefined}
          >
            <PasswordInput
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={!canSubmit}>
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
