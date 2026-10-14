"use client";

import { Mail } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  Spinner,
} from "@altr/apolyx";

import { EMAIL, useFormAction, wait } from "./form-shared";

type State = { error?: string; done?: string };

export default function FormInlineDemo() {
  const { state, pending, onSubmit } = useFormAction(async (_: State, data: FormData): Promise<State> => {
    const email = String(data.get("email") ?? "");
    if (!EMAIL.test(email)) return { error: "Enter a valid email." };
    await wait(700);
    return { done: email };
  }, {});

  return (
    <form onSubmit={onSubmit} noValidate className="grid w-full max-w-sm gap-1.5">
      <InputGroup>
        <InputGroupAddon>
          <Mail />
        </InputGroupAddon>
        <InputGroupInput
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@apolyx.dev"
          aria-label="Email"
          aria-invalid={state.error ? true : undefined}
          aria-describedby="newsletter-msg"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit" variant="default" disabled={pending} aria-busy={pending || undefined}>
            {pending ? <Spinner label="Subscribing" /> : null}
            Subscribe
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p
        id="newsletter-msg"
        aria-live="polite"
        className={state.error ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}
      >
        {state.error ?? (state.done ? `Subscribed ${state.done}. Check your inbox.` : "One email a month. No spam.")}
      </p>
    </form>
  );
}
