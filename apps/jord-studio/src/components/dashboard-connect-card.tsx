"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  CopyButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@altr/apolyx";

import { ProjectKeyReveal, type RevealedKeys } from "@/components/project-key-reveal";
import { RealtimeSnippetPanel } from "@/components/realtime-snippet-panel";
import { maskedKey } from "@/lib/studio-dashboard";
import { buildClientSnippet, buildEnvBlock } from "@/lib/studio-snippets";
import type { ProjectKeyPublic, ProjectPublic } from "@/lib/projects";

type Props = {
  slug: string;
  serverUrl: string;
  /** Registry record (public fields only: key prefix + last4). Null for the env-backed default. */
  project: ProjectPublic | null;
};

function Row({
  label,
  value,
  copyValue,
  note,
}: {
  label: string;
  value: string;
  copyValue?: string;
  note?: string;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr_auto] sm:items-center sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0">
        <code className="block truncate rounded-md bg-muted px-2 py-1.5 font-mono text-xs">
          {value}
        </code>
        {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
      </dd>
      <div>{copyValue ? <CopyButton value={copyValue} label={label.toLowerCase()} /> : null}</div>
    </div>
  );
}

/**
 * Connect card. Secrets are never in the page HTML: the secret key is only ever shown by the existing
 * one-time ProjectKeyReveal after an explicit, confirmed rotate (POST rotate-keys). The stored keys are
 * hashed, so a fresh publishable key is copyable only for the session in which it was rotated.
 */
export function DashboardConnectCard({ slug, serverUrl, project }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [ack, setAck] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ project: ProjectPublic; keys: RevealedKeys } | null>(null);
  const [freshPublishable, setFreshPublishable] = useState<string | null>(null);

  const pub: ProjectKeyPublic | undefined = project?.keys.find((k) => k.kind === "publishable");
  const barrier = project?.keys.find((k) => k.kind === "barrier");
  const secret = project?.keys.find((k) => k.kind === "secret");

  function rotate() {
    if (!project) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/admin/projects/${encodeURIComponent(project.id)}/rotate-keys`,
          { method: "POST" },
        );
        const json = (await res.json().catch(() => ({}))) as {
          project?: ProjectPublic;
          secret_key?: string;
          publishable_key?: string;
          barrier_key?: string;
          error?: string;
          message?: string;
        };
        if (!res.ok || !json.project || !json.secret_key) {
          setError(json.message ?? json.error ?? `Rotate failed (${res.status})`);
          return;
        }
        setFreshPublishable(json.publishable_key ?? null);
        setRevealed({
          project: json.project,
          keys: {
            secret_key: json.secret_key,
            publishable_key: json.publishable_key ?? "",
            barrier_key: json.barrier_key ?? "",
          },
        });
        setConfirming(false);
        setAck(false);
      } catch {
        setError("Cannot reach Studio.");
      }
    });
  }

  if (revealed) {
    return (
      <ProjectKeyReveal
        project={revealed.project}
        keys={revealed.keys}
        title="New keys — store them now"
        onDismiss={() => setRevealed(null)}
      />
    );
  }

  const env = buildEnvBlock({ url: serverUrl, publishableKey: freshPublishable, slug });
  const client = buildClientSnippet({ publishableKey: freshPublishable });

  return (
    <Card role="region" aria-labelledby="connect-title">
      <CardHeader>
        <CardTitle id="connect-title" as="h2">
          Connect
        </CardTitle>
        <CardDescription>
          Everything an app needs to talk to this project. Secret values are never rendered here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <dl className="flex flex-col gap-3">
          <Row label="Project URL" value={serverUrl} copyValue={serverUrl} />
          <Row label="Project slug" value={slug} copyValue={slug} />
          {project ? (
            <>
              <Row
                label="Publishable key"
                value={freshPublishable ?? (pub ? maskedKey(pub) : "not issued")}
                copyValue={freshPublishable ?? undefined}
                note={
                  freshPublishable
                    ? "Full value (this session only)."
                    : "Stored hashed — only the prefix and last 4 are known. Rotate to get a copyable value."
                }
              />
              <Row
                label="Secret key"
                value={secret ? `${maskedKey(secret)} (hidden)` : "not issued"}
                note="Shown once, only after a confirmed rotation."
              />
              <Row
                label="Barrier key"
                value={barrier ? maskedKey(barrier) : "not issued"}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              The env-backed default project has no registry keys. Register a project to issue
              publishable, secret and barrier keys.
            </p>
          )}
        </dl>

        {project ? (
          <div className="flex flex-col gap-3">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Rotation failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            {confirming ? (
              <Alert variant="warning">
                <AlertTitle>Rotate keys for {slug}?</AlertTitle>
                <AlertDescription>
                  <p>
                    This issues a new publishable, secret and barrier key and reveals the new secret
                    once. Apps still using the old secret will stop authenticating.
                  </p>
                  <label className="mt-3 flex items-start gap-3">
                    <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} />
                    <span>I understand the current secret key will be invalidated.</span>
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!ack || pending}
                      loading={pending}
                      onClick={rotate}
                    >
                      Rotate and reveal secret
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfirming(false);
                        setAck(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
                  Rotate keys…
                </Button>
              </div>
            )}
          </div>
        ) : null}

        <Tabs defaultValue="env">
          <TabsList aria-label="Connection snippets">
            <TabsTrigger value="env">.env</TabsTrigger>
            <TabsTrigger value="client">Client init</TabsTrigger>
            <TabsTrigger value="realtime">Realtime</TabsTrigger>
          </TabsList>
          <TabsContent value="env">
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {env}
              </pre>
              <CopyButton value={env} label="env block" />
            </div>
          </TabsContent>
          <TabsContent value="client">
            <div className="flex items-start gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {client}
              </pre>
              <CopyButton value={client} label="client snippet" />
            </div>
          </TabsContent>
          <TabsContent value="realtime">
            <RealtimeSnippetPanel
              slug={slug}
              serverUrl={serverUrl}
              publishableKey={freshPublishable}
              tableEditable
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
