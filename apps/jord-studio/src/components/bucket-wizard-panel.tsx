"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Field,
  FieldDescription,
  FieldInput,
  PasswordInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@altr/apolyx";

import { InspectorFooter } from "@/components/inspector-chrome";
import type { JordRole } from "@/lib/auth/roles";
import {
  BUCKET_PROVIDERS,
  JORD_BUCKET_PROVIDERS,
  bucketCredentialPayload,
  bucketDraftPayload,
  bucketDraftSignature,
  bucketProviderInfo,
  emptyBucketDraft,
  emitBucketsChanged,
  parseErrorText,
  readApiError,
  validateBucketDraft,
  type BucketDraft,
  type JordBucketProvider,
} from "@/lib/bucket-admin";

type Props = {
  role: JordRole;
  onClose: () => void;
};

type TestState = { ok: boolean; message: string } | null;

/** New-bucket wizard: provider → connection → live test → save (S0068). */
export function BucketWizardPanel({ onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<BucketDraft>(() => emptyBucketDraft());
  const [testState, setTestState] = useState<TestState>(null);
  const [testedSignature, setTestedSignature] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const info = bucketProviderInfo(draft.provider);
  const signature = useMemo(
    () => bucketDraftSignature(name, draft),
    [name, draft],
  );
  const testFresh = testedSignature != null && testedSignature === signature;
  const validation = validateBucketDraft(draft, {
    name,
    requireCredentials: true,
  });

  function update<Key extends keyof BucketDraft>(
    key: Key,
    value: BucketDraft[Key],
  ) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "provider") {
        const provider = value as JordBucketProvider;
        next.force_path_style =
          provider === "minio" || provider === "s3-compatible";
      }
      return next;
    });
    setTestState(null);
  }

  async function runTest() {
    setError(null);
    setTestState(null);
    if (validation.length > 0) {
      setTestState({ ok: false, message: validation[0]! });
      return;
    }
    setTesting(true);
    const snapshot = signature;
    try {
      const res = await fetch(
        `/api/admin/buckets/${encodeURIComponent(name.trim())}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...bucketDraftPayload(draft),
            ...bucketCredentialPayload(draft),
          }),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        setTestState({
          ok: false,
          message: parseErrorText(text, res.status) ?? "Connection test failed",
        });
        setTestedSignature(null);
        return;
      }
      setTestState({ ok: true, message: "Connection OK — put / head / delete passed." });
      setTestedSignature(snapshot);
    } catch {
      setTestState({ ok: false, message: "Cannot reach Studio BFF." });
      setTestedSignature(null);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setError(null);
    if (!testFresh) {
      setError("Run a passing connection test before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/buckets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ...bucketDraftPayload(draft),
          ...bucketCredentialPayload(draft),
        }),
      });
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      emitBucketsChanged();
      const params = new URLSearchParams(
        typeof window === "undefined" ? "" : window.location.search,
      );
      params.set("bucket", name.trim());
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      onClose();
    } catch {
      setError("Create failed — the Studio BFF is unreachable.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-4 px-4 py-4">
        <p className="text-xs text-muted-foreground">
          A bucket owns its provider and limits. Nothing is written until the
          connection test passes.
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create bucket</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Field label="Bucket name" required>
          <FieldInput
            value={name}
            onChange={(e) => {
              setName(e.target.value.toLowerCase());
              setTestState(null);
            }}
            placeholder="lab-assets"
            autoComplete="off"
            spellCheck={false}
          />
          <FieldDescription>
            Immutable slug used in object URLs and policies:{" "}
            <code className="font-mono">[a-z0-9][a-z0-9_-]&#123;0,62&#125;</code>
          </FieldDescription>
        </Field>

        <Field label="Provider" required>
          <Select
            value={draft.provider}
            onValueChange={(value) => update("provider", value as JordBucketProvider)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JORD_BUCKET_PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {BUCKET_PROVIDERS[provider].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>{info.blurb}</FieldDescription>
        </Field>

        {info.needsEndpoint ? (
          <Field label="Endpoint" required>
            <FieldInput
              value={draft.endpoint}
              onChange={(e) => update("endpoint", e.target.value)}
              placeholder="https://minio.example.com"
              spellCheck={false}
            />
          </Field>
        ) : null}

        {info.needsRegion ? (
          <Field
            label="Region"
            required={draft.provider !== "r2"}
            description={draft.provider === "r2" ? "R2 uses auto by default." : undefined}
          >
            <FieldInput
              value={draft.region}
              onChange={(e) => update("region", e.target.value)}
              placeholder={draft.provider === "r2" ? "auto" : "eu-central-1"}
              spellCheck={false}
            />
          </Field>
        ) : null}

        {info.needsPhysical ? (
          <Field label="Physical bucket" required>
            <FieldInput
              value={draft.physical_bucket}
              onChange={(e) => update("physical_bucket", e.target.value)}
              placeholder="altr-lab"
              spellCheck={false}
            />
          </Field>
        ) : null}

        <Field label="Key prefix" optional>
          <FieldInput
            value={draft.key_prefix}
            onChange={(e) => update("key_prefix", e.target.value)}
            placeholder="jord/"
            spellCheck={false}
          />
        </Field>

        {!info.needsEndpoint ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Path-style addressing</p>
              <p className="text-xs text-muted-foreground">
                Required by MinIO and most self-hosted gateways.
              </p>
            </div>
            <Switch
              checked={draft.force_path_style}
              onCheckedChange={(checked) => update("force_path_style", checked)}
              aria-label="Path-style addressing"
            />
          </div>
        ) : null}

        {info.s3Family ? (
          <div className="flex flex-col gap-3 rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Credentials</p>
              <p className="text-xs text-muted-foreground">
                Write-only: sealed server-side and never returned to the browser.
              </p>
            </div>
            <Field label="Access key" required>
              <FieldInput
                value={draft.access_key}
                onChange={(e) => update("access_key", e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Secret key" required>
              <PasswordInput
                value={draft.secret_key}
                onChange={(e) => update("secret_key", e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Session token" optional>
              <PasswordInput
                value={draft.session_token}
                onChange={(e) => update("session_token", e.target.value)}
                autoComplete="off"
              />
            </Field>
          </div>
        ) : null}

        {testState ? (
          <Alert variant={testState.ok ? "success" : "destructive"}>
            <AlertTitle>
              {testState.ok ? "Connection test passed" : "Connection test failed"}
            </AlertTitle>
            <AlertDescription>{testState.message}</AlertDescription>
          </Alert>
        ) : null}

        {!testFresh && !testState ? (
          <p className="text-xs text-muted-foreground">
            Create stays disabled until a connection test passes for these
            values.
          </p>
        ) : null}
      </div>

      <InspectorFooter>
        <Button
          type="button"
          variant="outline"
          onClick={runTest}
          disabled={testing || saving || validation.length > 0}
        >
          {testing ? "Testing…" : "Test connection"}
        </Button>
        <Button type="button" onClick={save} disabled={saving || !testFresh}>
          {saving ? "Creating…" : "Create bucket"}
        </Button>
      </InspectorFooter>
    </div>
  );
}
