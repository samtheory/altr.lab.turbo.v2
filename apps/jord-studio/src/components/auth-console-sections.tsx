"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  Badge,
  Button,
  Field,
  FieldDescription,
  FieldInput,
  FieldTextarea,
  Switch,
} from "@altr/apolyx";

import type { JordRole } from "@/lib/auth/roles";
import { formatStudioTime, readStudioError } from "@/lib/studio-api";
import {
  AUTH_RATE_LIMIT_KEYS,
  AUTH_SETTINGS_LIMITS,
  DEFAULT_AUTH_RATE_LIMITS,
  allowlistErrors,
  buildClaimsPreview,
  emptyAuthSettings,
  formatJwtFingerprint,
  normalizeRateLimits,
  parseAllowlistText,
  parseClaimsJson,
  type AuthRateLimitKey,
  type AuthRateLimits,
  type AuthSettings,
  type AuthSettingsPatch,
} from "@/lib/studio-auth-settings";

type SectionProps = { role: JordRole };

const RATE_LIMIT_LABELS: Record<AuthRateLimitKey, string> = {
  signup: "Sign-up",
  signin: "Sign-in",
  refresh: "Token refresh",
  recover: "Password recovery",
  reset: "Password reset",
  confirm: "Email confirmation",
};

function useAuthSettings(role: JordRole) {
  const [settings, setSettings] = useState<AuthSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/auth/settings", { cache: "no-store" });
    if (!res.ok) throw new Error(await readStudioError(res));
    const body = (await res.json()) as { settings: AuthSettings };
    setSettings({
      ...emptyAuthSettings(),
      ...body.settings,
      rate_limits: normalizeRateLimits(body.settings.rate_limits),
      custom_claims: body.settings.custom_claims ?? {},
    });
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    void load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load settings"),
    );
  }, [load, role]);

  const save = useCallback(
    async (patch: AuthSettingsPatch): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch("/api/admin/auth/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          setError(await readStudioError(res));
          return false;
        }
        await load();
        setNotice("Saved.");
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  return { settings, setSettings, error, setError, notice, setNotice, saving, save, load };
}

function Header({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Auth
      </p>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Restricted() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Alert variant="warning">
        <AlertTitle>Admin only</AlertTitle>
        <AlertDescription>
          The auth console is limited to operator admin sessions.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function Feedback({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {notice ? (
        <Alert>
          <AlertTitle>Done</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function ProviderRow({
  title,
  description,
  checked,
  disabled,
  badge,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  badge?: string;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          {badge ? <Badge variant="secondary">{badge}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={title}
      />
    </div>
  );
}

export function AuthProvidersSection({ role }: SectionProps) {
  const { settings, error, notice, saving, save } = useAuthSettings(role);

  if (role !== "admin") return <Restricted />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Header
        title="Providers"
        description="Which sign-in methods this project accepts. Changes apply to the next auth request."
      />
      <Feedback error={error} notice={notice} />

      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading providers…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <ProviderRow
            title="Email and password"
            description="Sign-up and /auth/signin with a password. Disabling returns 403 provider_disabled."
            checked={settings.email_password_enabled}
            disabled={saving}
            onChange={(next) => void save({ email_password_enabled: next })}
          />
          <ProviderRow
            title="Anonymous sign-ins"
            description="Allows POST /auth/anon-key to mint a long-lived anon token."
            checked={settings.anonymous_enabled}
            disabled={saving}
            onChange={(next) => void save({ anonymous_enabled: next })}
          />
          <ProviderRow
            title="Magic link"
            description="Server capability lands with the magic-link card; the toggle is intentionally disabled."
            checked={false}
            disabled
            badge="S0074"
          />
          <ProviderRow
            title="OAuth"
            description="Google, GitHub, Apple and friends need the OAuth provider card first."
            checked={false}
            disabled
            badge="S0075"
          />
        </div>
      )}
    </div>
  );
}

export function AuthUrlsSection({ role }: SectionProps) {
  const { settings, error, setError, notice, saving, save } =
    useAuthSettings(role);
  const [siteUrl, setSiteUrl] = useState("");
  const [rows, setRows] = useState<string[]>([]);

  useEffect(() => {
    if (!settings) return;
    setSiteUrl(settings.site_url ?? "");
    setRows(settings.redirect_allowlist);
  }, [settings]);

  if (role !== "admin") return <Restricted />;

  function update(index: number, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? value : row)));
  }

  async function submit() {
    const cleaned = rows.map((row) => row.trim()).filter((row) => row !== "");
    const problems = allowlistErrors(cleaned);
    if (problems.length > 0) {
      setError(problems.join(" · "));
      return;
    }
    await save({
      site_url: siteUrl.trim() === "" ? null : siteUrl.trim(),
      redirect_allowlist: cleaned,
    });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Header
        title="URL configuration"
        description="Site URL plus the redirect allow-list. With no configuration every redirect_to is rejected (fail closed)."
      />
      <Feedback error={error} notice={notice} />

      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading URLs…</p>
      ) : (
        <>
          <Field
            label="Site URL"
            description="Same-origin redirects are always allowed. Leave empty to require the allow-list."
          >
            <FieldInput
              value={siteUrl}
              placeholder="https://app.example.com"
              onChange={(event) => setSiteUrl(event.target.value)}
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Redirect allow-list</p>
                <p className="text-xs text-muted-foreground">
                  One pattern per row. <code>*</code> matches one path segment,{" "}
                  <code>**</code> matches anything.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRows((prev) => [...prev, ""])}
              >
                Add pattern
              </Button>
            </div>

            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                No patterns yet — redirects are rejected.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <FieldInput
                      value={row}
                      className="font-mono text-xs"
                      placeholder="https://app.example.com/**"
                      aria-label={`Redirect pattern ${index + 1}`}
                      onChange={(event) => update(index, event.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove pattern ${index + 1}`}
                      onClick={() =>
                        setRows((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? "Saving…" : "Save URL configuration"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function AuthJwtSection({ role }: SectionProps) {
  const { settings, setSettings, error, setError, notice, setNotice, saving, save, load } =
    useAuthSettings(role);
  const [ttl, setTtl] = useState(900);
  const [claimsText, setClaimsText] = useState("{}");
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setTtl(settings.session_ttl_seconds);
    setClaimsText(JSON.stringify(settings.custom_claims, null, 2));
  }, [settings]);

  const preview = useMemo(() => {
    const parsed = parseClaimsJson(claimsText);
    return buildClaimsPreview({
      customClaims: parsed.ok ? parsed.value : {},
      ttlSeconds: Number.isFinite(ttl) ? ttl : 900,
    });
  }, [claimsText, ttl]);

  if (role !== "admin") return <Restricted />;

  async function rotate() {
    setBusy("rotate");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/auth/jwt/rotate", { method: "POST" });
      if (!res.ok) {
        setError(await readStudioError(res));
        return;
      }
      await load();
      setNotice(
        "New signing key stored. Every existing access token is now invalid.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function resetKey() {
    setBusy("reset");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/auth/jwt/key", { method: "DELETE" });
      if (!res.ok) {
        setError(await readStudioError(res));
        return;
      }
      await load();
      setNotice("Stored key removed — signing falls back to JORD_JWT_SECRET.");
    } finally {
      setBusy(null);
    }
  }

  async function saveClaims() {
    const parsed = parseClaimsJson(claimsText);
    if (!parsed.ok) {
      setClaimsError(parsed.error);
      return;
    }
    setClaimsError(null);
    const ok = await save({
      custom_claims: parsed.value,
      session_ttl_seconds: Math.round(ttl),
    });
    if (!ok) setSettings(settings);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Header
        title="JWT"
        description="Signing key, access-token lifetime and custom claims for end-user tokens."
      />
      <Feedback error={error} notice={notice} />

      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading JWT settings…</p>
      ) : (
        <>
          <div className="space-y-3 rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Signing key</p>
                <p className="text-xs text-muted-foreground">
                  Source:{" "}
                  <span className="font-mono">
                    {settings.jwt_key_source ?? "env"}
                  </span>
                </p>
              </div>
              <Badge variant={settings.jwt_key_configured ? "success" : "secondary"}>
                {settings.jwt_key_configured ? "configured" : "missing"}
              </Badge>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fingerprint
                </dt>
                <dd className="font-mono text-xs">
                  {formatJwtFingerprint(settings.jwt_key_fingerprint)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rotated
                </dt>
                <dd>{formatStudioTime(settings.jwt_key_rotated_at)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Rotation replaces the key and invalidates every access token
              immediately; refresh tokens stay valid. The key itself is never
              returned to the browser.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy !== null || saving}
                onClick={() => setRotateOpen(true)}
              >
                Rotate key
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy !== null || !settings.jwt_key_configured}
                onClick={() => void resetKey()}
              >
                {busy === "reset" ? "Resetting…" : "Reset to env key"}
              </Button>
            </div>
          </div>

          <Field
            label="Access-token lifetime (seconds)"
            description={`Current token TTL. ${AUTH_SETTINGS_LIMITS.sessionTtlSeconds.min}–${AUTH_SETTINGS_LIMITS.sessionTtlSeconds.max}.`}
          >
            <FieldInput
              type="number"
              min={AUTH_SETTINGS_LIMITS.sessionTtlSeconds.min}
              max={AUTH_SETTINGS_LIMITS.sessionTtlSeconds.max}
              value={ttl}
              onChange={(event) => setTtl(Number(event.target.value))}
            />
          </Field>

          <Field
            label="Custom claims"
            description="Merged into user access tokens on sign-in and refresh. Reserved claims cannot be overridden."
            error={claimsError ?? undefined}
          >
            <FieldTextarea
              value={claimsText}
              rows={7}
              spellCheck={false}
              className="font-mono text-xs"
              onChange={(event) => setClaimsText(event.target.value)}
            />
          </Field>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Decoded preview (sample principal)
              </p>
              <Badge variant="outline">{preview.ttlMinutes} min</Badge>
            </div>
            <pre className="mt-3 overflow-x-auto text-xs">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>

          <div>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void saveClaims()}
            >
              {saving ? "Saving…" : "Save JWT settings"}
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the signing key?</AlertDialogTitle>
            <AlertDialogDescription>
              Every access token signed with the current key stops working
              immediately. Users must refresh or sign in again; refresh tokens
              are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!settings?.jwt_key_configured ? (
            <Alert variant="warning">
              <AlertTitle>Master key required</AlertTitle>
              <AlertDescription>
                Set <code>JORD_MASTER_KEY</code> to store a rotated key; without
                it the server answers 503.
              </AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy !== null}
              onClick={() => void rotate()}
            >
              Rotate key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AuthRateLimitsSection({ role }: SectionProps) {
  const { settings, error, setError, notice, saving, save } =
    useAuthSettings(role);
  const [limits, setLimits] = useState<AuthRateLimits>({
    ...DEFAULT_AUTH_RATE_LIMITS,
  });

  useEffect(() => {
    if (settings) setLimits(normalizeRateLimits(settings.rate_limits));
  }, [settings]);

  if (role !== "admin") return <Restricted />;

  function update(key: AuthRateLimitKey, value: number) {
    setLimits((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    for (const key of AUTH_RATE_LIMIT_KEYS) {
      const value = limits[key];
      if (
        !Number.isFinite(value) ||
        value < AUTH_SETTINGS_LIMITS.rateLimit.min ||
        value > AUTH_SETTINGS_LIMITS.rateLimit.max
      ) {
        setError(
          `${RATE_LIMIT_LABELS[key]} must be ${AUTH_SETTINGS_LIMITS.rateLimit.min}–${AUTH_SETTINGS_LIMITS.rateLimit.max}.`,
        );
        return;
      }
    }
    await save({ rate_limits: limits });
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Header
        title="Rate limits"
        description="Requests per minute per client IP for each public auth endpoint. Changes take effect on the next request."
      />
      <Feedback error={error} notice={notice} />

      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading limits…</p>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Endpoint</th>
                  <th className="px-4 py-2 font-medium">Default</th>
                  <th className="px-4 py-2 font-medium">Limit / min</th>
                </tr>
              </thead>
              <tbody>
                {AUTH_RATE_LIMIT_KEYS.map((key) => (
                  <tr key={key} className="border-t border-border">
                    <td className="px-4 py-2">{RATE_LIMIT_LABELS[key]}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {DEFAULT_AUTH_RATE_LIMITS[key]}
                    </td>
                    <td className="px-4 py-2">
                      <FieldInput
                        type="number"
                        min={AUTH_SETTINGS_LIMITS.rateLimit.min}
                        max={AUTH_SETTINGS_LIMITS.rateLimit.max}
                        value={limits[key]}
                        aria-label={`${RATE_LIMIT_LABELS[key]} limit`}
                        onChange={(event) => update(key, Number(event.target.value))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? "Saving…" : "Save limits"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setLimits({ ...DEFAULT_AUTH_RATE_LIMITS })}
            >
              Reset to defaults
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function AuthSettingsSection({ role }: SectionProps) {
  const { settings, error, notice, saving, save } = useAuthSettings(role);
  const [draft, setDraft] = useState<AuthSettings>(emptyAuthSettings());

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  if (role !== "admin") return <Restricted />;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Header
        title="Settings"
        description="Sign-up policy, confirmation, password length and session lifetime for this project."
      />
      <Feedback error={error} notice={notice} />

      {!settings ? (
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      ) : (
        <>
          <ProviderRow
            title="Allow public sign-up"
            description="When off, POST /auth/signup returns 403 signups_disabled."
            checked={draft.signups_enabled}
            disabled={saving}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, signups_enabled: next }))
            }
          />
          <ProviderRow
            title="Auto-confirm email"
            description="Skips the confirmation token and email on sign-up."
            checked={draft.autoconfirm}
            disabled={saving}
            onChange={(next) =>
              setDraft((prev) => ({ ...prev, autoconfirm: next }))
            }
          />

          <Field
            label="Minimum password length"
            description={`${AUTH_SETTINGS_LIMITS.passwordMinLength.min}–${AUTH_SETTINGS_LIMITS.passwordMinLength.max} characters. Passwords still cannot equal the email.`}
          >
            <FieldInput
              type="number"
              min={AUTH_SETTINGS_LIMITS.passwordMinLength.min}
              max={AUTH_SETTINGS_LIMITS.passwordMinLength.max}
              value={draft.password_min_length}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  password_min_length: Number(event.target.value),
                }))
              }
            />
          </Field>

          <Field
            label="Session lifetime (seconds)"
            description="Access-token TTL used by sign-in and refresh."
          >
            <FieldInput
              type="number"
              min={AUTH_SETTINGS_LIMITS.sessionTtlSeconds.min}
              max={AUTH_SETTINGS_LIMITS.sessionTtlSeconds.max}
              value={draft.session_ttl_seconds}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  session_ttl_seconds: Number(event.target.value),
                }))
              }
            />
            <FieldDescription>
              Also editable from the JWT section.
            </FieldDescription>
          </Field>

          <div>
            <Button
              type="button"
              disabled={saving}
              onClick={() =>
                void save({
                  signups_enabled: draft.signups_enabled,
                  autoconfirm: draft.autoconfirm,
                  password_min_length: draft.password_min_length,
                  session_ttl_seconds: draft.session_ttl_seconds,
                })
              }
            >
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
