"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Checkbox,
  Field,
  FieldInput,
} from "@altr/apolyx";

import type { ProjectPublic } from "@/lib/projects";

export type RevealedKeys = {
  publishable_key: string;
  secret_key: string;
  barrier_key: string;
};

type Props = {
  project: ProjectPublic;
  keys: RevealedKeys;
  title?: string;
  onDismiss: () => void;
};

function CopyField({
  label,
  value,
  description,
  secret,
}: {
  label: string;
  value: string;
  description?: string;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const inputId = useId();

  return (
    <Field label={label} description={description}>
      <div className="flex gap-2">
        <FieldInput
          id={inputId}
          readOnly
          value={value}
          type={secret ? "password" : "text"}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              /* clipboard may be denied */
            }
          }}
        >
          {copied ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </Field>
  );
}

export function ProjectKeyReveal({
  project,
  keys,
  title = "Store these keys now",
  onDismiss,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const envBlock = [
    `JORD_PUBLISHABLE_KEY=${keys.publishable_key}`,
    `JORD_SECRET_KEY=${keys.secret_key}`,
    `JORD_BARRIER_KEY=${keys.barrier_key}`,
  ].join("\n");

  const clientSnippet = `import { createJordClient } from "@altr/jord-client";

const jord = createJordClient({
  url: process.env.NEXT_PUBLIC_JORD_URL!,
  publishableKey: "${keys.publishable_key}",
});`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-key-reveal-title"
      className="mx-auto flex max-w-2xl flex-col gap-6 rounded-lg border border-border bg-background px-4 py-8 sm:px-6"
    >
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Project · {project.slug}
        </p>
        <h2
          id="project-key-reveal-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-2xl font-semibold tracking-tight outline-none"
        >
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">
          The secret key is shown once and cannot be fetched again. Copy it
          before leaving this screen.
        </p>
      </div>

      <Alert variant="warning">
        <AlertTitle>One-time reveal</AlertTitle>
        <AlertDescription>
          Closing without copying means you must rotate keys to get a new
          secret.
        </AlertDescription>
      </Alert>

      <CopyField
        label="Publishable key"
        value={keys.publishable_key}
        description="Safe for client apps (header-scoped)."
      />
      <CopyField
        label="Secret key"
        value={keys.secret_key}
        description="Server-only. Shown exactly once."
        secret
      />
      <CopyField
        label="Barrier key"
        value={keys.barrier_key}
        description="Rate-limit / origin barrier."
      />

      <Field label="Env block">
        <textarea
          readOnly
          className="min-h-24 w-full rounded-md border border-border bg-muted/30 p-3 font-mono text-xs"
          value={envBlock}
          onFocus={(e) => e.currentTarget.select()}
        />
      </Field>

      <Field label="Client init snippet">
        <textarea
          readOnly
          className="min-h-28 w-full rounded-md border border-border bg-muted/30 p-3 font-mono text-xs"
          value={clientSnippet}
          onFocus={(e) => e.currentTarget.select()}
        />
      </Field>

      <label className="flex items-start gap-3 text-sm">
        <Checkbox
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          aria-describedby="stored-confirm-hint"
        />
        <span id="stored-confirm-hint">
          I stored the secret key somewhere safe (password manager / secrets
          store).
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="button" disabled={!confirmed} onClick={onDismiss}>
          Continue to project
        </Button>
        {confirmed ? (
          <Button type="button" variant="outline" asChild>
            <Link href={`/p/${encodeURIComponent(project.slug)}/tables`}>
              Open /p/{project.slug}/tables
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
