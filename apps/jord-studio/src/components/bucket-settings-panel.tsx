"use client";

import { useEffect, useState } from "react";

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

import {
  BUCKET_PROVIDERS,
  JORD_BUCKET_PROVIDERS,
  bucketCredentialPayload,
  bucketDraftPayload,
  bucketProviderInfo,
  draftFromBucket,
  emitBucketsChanged,
  formatTimestamp,
  parseErrorText,
  readApiError,
  validateBucketDraft,
  type BucketDraft,
  type BucketPublic,
  type JordBucketProvider,
} from "@/lib/bucket-admin";

type Props = {
  bucket: BucketPublic;
  canManage: boolean;
  onUpdated: (bucket: BucketPublic) => void;
};

type Notice = { tone: "success" | "destructive" | "info"; message: string } | null;

/** Bucket settings tab: connection, limits, access, pause/resume, rotation. */
export function BucketSettingsPanel({ bucket, canManage, onUpdated }: Props) {
  const [draft, setDraft] = useState<BucketDraft>(() => draftFromBucket(bucket));
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [rotation, setRotation] = useState({ access_key: "", secret_key: "", session_token: "" });

  useEffect(() => {
    setDraft(draftFromBucket(bucket));
  }, [bucket]);

  const info = bucketProviderInfo(draft.provider);
  const validation = validateBucketDraft(draft);

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
  }

  async function action(name: "test" | "pause" | "resume"): Promise<void> {
    setError(null);
    setNotice(null);
    setPending(name);
    try {
      const body =
        name === "test" ? JSON.stringify(bucketDraftPayload(draft)) : "{}";
      const res = await fetch(
        `/api/admin/buckets/${encodeURIComponent(bucket.name)}/${name}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        },
      );
      const text = await res.text();
      if (!res.ok) {
        setError(parseErrorText(text, res.status) ?? `Bucket ${name} failed`);
        return;
      }
      if (name === "test") {
        setNotice({ tone: "success", message: "Connection test passed." });
        return;
      }
      const parsed = JSON.parse(text) as { bucket?: BucketPublic };
      if (parsed.bucket) onUpdated(parsed.bucket);
      setNotice({
        tone: "success",
        message: name === "pause" ? "Bucket paused." : "Bucket resumed.",
      });
      emitBucketsChanged();
    } catch {
      setError("Cannot reach Studio BFF.");
    } finally {
      setPending(null);
    }
  }

  async function save() {
    setError(null);
    setNotice(null);
    setPending("save");
    try {
      const res = await fetch(
        `/api/admin/buckets/${encodeURIComponent(bucket.name)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bucketDraftPayload(draft)),
        },
      );
      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { bucket?: BucketPublic };
      if (body.bucket) onUpdated(body.bucket);
      setNotice({ tone: "success", message: "Bucket settings saved." });
      emitBucketsChanged();
    } catch {
      setError("Cannot reach Studio BFF.");
    } finally {
      setPending(null);
    }
  }

  async function rotate() {
    setError(null);
    setNotice(null);
    setPending("rotate");
    try {
      const res = await fetch(
        `/api/admin/buckets/${encodeURIComponent(bucket.name)}/rotate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bucketCredentialPayload({
            ...emptyRotationDraft,
            ...rotation,
          })),
        },
      );
      const text = await res.text();
      if (!res.ok) {
        setError(parseErrorText(text, res.status) ?? "Rotation failed");
        return;
      }
      const body = JSON.parse(text) as { bucket?: BucketPublic };
      if (body.bucket) onUpdated(body.bucket);
      setRotation({ access_key: "", secret_key: "", session_token: "" });
      setNotice({
        tone: "success",
        message: "Credentials rotated — the previous keys stop working now.",
      });
      emitBucketsChanged();
    } catch {
      setError("Cannot reach Studio BFF.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Settings error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert variant={notice.tone === "success" ? "success" : "info"}>
          <AlertTitle>
            {notice.tone === "success" ? "Saved" : "Status"}
          </AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Connection</h3>
          <p className="text-xs text-muted-foreground">
            Last write {formatTimestamp(bucket.last_write_at)} · updated{" "}
            {formatTimestamp(bucket.updated_at)}
          </p>
        </div>

        <Field label="Provider">
          <Select
            value={draft.provider}
            onValueChange={(value) => update("provider", value as JordBucketProvider)}
            disabled={!canManage}
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
        </Field>

        {info.needsEndpoint ? (
          <Field label="Endpoint" required>
            <FieldInput
              value={draft.endpoint}
              disabled={!canManage}
              onChange={(e) => update("endpoint", e.target.value)}
            />
          </Field>
        ) : null}

        {info.needsRegion ? (
          <Field label="Region" required={draft.provider !== "r2"}>
            <FieldInput
              value={draft.region}
              disabled={!canManage}
              onChange={(e) => update("region", e.target.value)}
            />
          </Field>
        ) : null}

        {info.needsPhysical ? (
          <Field label="Physical bucket" required>
            <FieldInput
              value={draft.physical_bucket}
              disabled={!canManage}
              onChange={(e) => update("physical_bucket", e.target.value)}
            />
          </Field>
        ) : null}

        <Field label="Key prefix" optional>
          <FieldInput
            value={draft.key_prefix}
            disabled={!canManage}
            onChange={(e) => update("key_prefix", e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Path-style addressing</p>
            <p className="text-xs text-muted-foreground">
              MinIO / self-hosted gateways usually need this on.
            </p>
          </div>
          <Switch
            checked={draft.force_path_style}
            disabled={!canManage}
            onCheckedChange={(checked) => update("force_path_style", checked)}
            aria-label="Path-style addressing"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Limits</h3>
          <p className="text-xs text-muted-foreground">
            Enforced server-side at upload and sign time.
          </p>
        </div>
        <Field label="Max object size (MB)" optional>
          <FieldInput
            value={draft.max_size_mb}
            disabled={!canManage}
            inputMode="decimal"
            onChange={(e) => update("max_size_mb", e.target.value)}
            placeholder="env default"
          />
        </Field>
        <Field label="Allowed MIME types" optional>
          <FieldInput
            value={draft.allowed_mime_types}
            disabled={!canManage}
            onChange={(e) => update("allowed_mime_types", e.target.value)}
            placeholder="image/png, application/pdf"
          />
          <FieldDescription>
            Comma separated; blank allows every type.
          </FieldDescription>
        </Field>
        <Field label="Signed URL TTL (seconds)" optional>
          <FieldInput
            value={draft.sign_ttl_seconds}
            disabled={!canManage}
            inputMode="numeric"
            onChange={(e) => update("sign_ttl_seconds", e.target.value)}
            placeholder="300"
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Access</h3>
        <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Public read</p>
            <p className="text-xs text-muted-foreground">
              Anonymous downloads for ready objects in this bucket.
            </p>
          </div>
          <Switch
            checked={draft.public_read}
            disabled={!canManage}
            onCheckedChange={(checked) => update("public_read", checked)}
            aria-label="Public read"
          />
        </div>
        <Field label="Linked table" optional>
          <FieldInput
            value={draft.linked_table}
            disabled={!canManage}
            onChange={(e) => update("linked_table", e.target.value)}
            placeholder="attachments"
            spellCheck={false}
          />
          <FieldDescription>
            Optional records table that owns files for row-level attachments.
          </FieldDescription>
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">Credentials</h3>
          <p className="text-xs text-muted-foreground">
            {bucket.configured
              ? `Sealed · ${bucket.access_key_prefix ?? "????"}…${bucket.access_key_last4 ?? "????"}`
              : info.s3Family
                ? "No sealed credentials yet."
                : "Credentials do not apply to the local provider."}
          </p>
        </div>

        {info.s3Family ? (
          <>
            <Field label="New access key">
              <FieldInput
                value={rotation.access_key}
                disabled={!canManage}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) =>
                  setRotation((prev) => ({ ...prev, access_key: e.target.value }))
                }
              />
            </Field>
            <Field label="New secret key">
              <PasswordInput
                value={rotation.secret_key}
                disabled={!canManage}
                autoComplete="new-password"
                onChange={(e) =>
                  setRotation((prev) => ({ ...prev, secret_key: e.target.value }))
                }
              />
            </Field>
            <Field label="New session token" optional>
              <PasswordInput
                value={rotation.session_token}
                disabled={!canManage}
                autoComplete="off"
                onChange={(e) =>
                  setRotation((prev) => ({
                    ...prev,
                    session_token: e.target.value,
                  }))
                }
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={
                  !canManage ||
                  pending === "rotate" ||
                  !rotation.access_key.trim() ||
                  !rotation.secret_key.trim()
                }
                onClick={rotate}
              >
                {pending === "rotate" ? "Rotating…" : "Rotate credentials"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Rotation probes with the new keys first; a failed probe keeps the
              old credentials.
            </p>
          </>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Lifecycle</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={bucket.status === "paused" ? "default" : "outline"}
            disabled={!canManage || pending != null}
            onClick={() => action(bucket.status === "paused" ? "resume" : "pause")}
          >
            {bucket.status === "paused" ? "Resume bucket" : "Pause bucket"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canManage || pending != null || validation.length > 0}
            onClick={() => action("test")}
          >
            {pending === "test" ? "Testing…" : "Test connection"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Paused buckets reject uploads, downloads and signing with 503.
        </p>
      </section>

      {canManage ? (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          <Button
            type="button"
            disabled={pending === "save" || validation.length > 0}
            onClick={save}
          >
            {pending === "save" ? "Saving…" : "Save settings"}
          </Button>
          {validation.length > 0 ? (
            <p className="self-center text-xs text-destructive">
              {validation[0]}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const emptyRotationDraft: BucketDraft = {
  provider: "s3",
  endpoint: "",
  region: "",
  physical_bucket: "",
  key_prefix: "",
  force_path_style: false,
  public_read: false,
  max_size_mb: "",
  allowed_mime_types: "",
  sign_ttl_seconds: "",
  linked_table: "",
  access_key: "",
  secret_key: "",
  session_token: "",
};
