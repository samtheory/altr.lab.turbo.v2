"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { cn } from "../lib/utils";

export type HeroWaitlistAvatar = {
  initials: string;
  photo?: string;
  alt?: string;
};

export type HeroWaitlistAction = {
  label?: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export type HeroWaitlistProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  email: string;
  onEmailChange: (value: string) => void;
  onSubmit?: (email: string) => void;
  emailLabel?: string;
  placeholder?: string;
  submitLabel?: React.ReactNode;
  avatars?: HeroWaitlistAvatar[];
  socialProof?: React.ReactNode;
  secondaryAction?: HeroWaitlistAction;
  className?: string;
};

/** Waitlist hero with controlled email field, join CTA, and optional social-proof avatars. */
export function HeroWaitlist({
  title = "Get early access",
  description = "Join the waitlist for the next wave of Apolyx blocks and agent chrome.",
  email,
  onEmailChange,
  onSubmit,
  emailLabel = "Work email",
  placeholder = "you@company.com",
  submitLabel = "Join waitlist",
  avatars,
  socialProof,
  secondaryAction,
  className,
}: HeroWaitlistProps) {
  const id = React.useId();
  const inputId = `${id}-email`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit?.(email);
  }

  return (
    <section
      data-slot="hero-waitlist"
      className={cn(
        "relative mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center",
        className,
      )}
    >
      <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
          <label htmlFor={inputId} className="sr-only">
            {emailLabel}
          </label>
          <Input
            id={inputId}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={placeholder}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="h-11 bg-card"
          />
        </div>
        <Button type="submit" className="h-11 shrink-0 px-6">
          {submitLabel}
        </Button>
      </form>

      {(avatars?.length || socialProof || secondaryAction) ? (
        <div className="mt-8 flex w-full max-w-md flex-col items-center gap-4">
          {avatars && avatars.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
              <WaitlistAvatarStack avatars={avatars} />
              {socialProof ? (
                <p className="text-sm text-muted-foreground">{socialProof}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Trusted by teams shipping with Apolyx
                </p>
              )}
            </div>
          ) : socialProof ? (
            <p className="text-sm text-muted-foreground">{socialProof}</p>
          ) : null}

          {secondaryAction ? (
            secondaryAction.href ? (
              <Button variant="link" asChild className="h-auto p-0 text-sm">
                <a href={secondaryAction.href}>{secondaryAction.label ?? "Learn more"}</a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label ?? "Learn more"}
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function WaitlistAvatarStack({ avatars }: { avatars: HeroWaitlistAvatar[] }) {
  const shown = avatars.slice(0, 6);
  const overflow = Math.max(0, avatars.length - shown.length);
  return (
    <div className="flex items-center pl-2">
      {shown.map((a, i) => (
        <span
          key={`${a.initials}-${i}`}
          className={cn(
            "relative -ml-2 ring-2 ring-background first:ml-0",
            "rounded-full",
          )}
          style={{ zIndex: shown.length - i }}
        >
          <Avatar className="size-9 border border-border bg-card">
            {a.photo ? <AvatarImage src={a.photo} alt={a.alt ?? a.initials} /> : null}
            <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
              {a.initials}
            </AvatarFallback>
          </Avatar>
        </span>
      ))}
      {overflow > 0 ? (
        <span className="relative -ml-2 flex size-9 items-center justify-center rounded-full border border-border bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}