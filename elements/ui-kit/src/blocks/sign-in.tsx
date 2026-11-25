"use client";

import * as React from "react";
import { motion } from "motion/react";

import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useReducedMotion } from "../motion/use-reduced-motion";

export type OAuthProvider = "google" | "github";

export type SignInBlockProps = {
  title?: string;
  subtitle?: string;
  showOAuth?: boolean;
  onSubmit?: (payload: { email: string; password: string }) => void;
  onOAuth?: (provider: OAuthProvider) => void;
  className?: string;
};

/** Email/password sign-in block with optional OAuth affordances. */
export function SignInBlock({
  title = "Welcome back",
  subtitle = "Sign in to continue to your workspace.",
  showOAuth = true,
  onSubmit,
  onOAuth,
  className,
}: SignInBlockProps) {
  const reduce = useReducedMotion();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit?.({ email, password });
  }

  return (
    <motion.div
      data-slot="sign-in-block"
      className={cn(
        "w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm",
        className,
      )}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="mb-6 space-y-1">
        <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </header>

      {showOAuth ? (
        <div className="mb-6 flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOAuth?.("google")}
          >
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOAuth?.("github")}
          >
            Continue with GitHub
          </Button>
          <div className="relative my-2 text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or</span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sign-in-email">Email</Label>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sign-in-password">Password</Label>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </motion.div>
  );
}