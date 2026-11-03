"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  CopyButton,
  Field,
  FieldInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@altr/apolyx";

import { isRealtimeSubscribeTable } from "@/lib/realtime-table";
import {
  ENV_NAMES,
  REALTIME_LANGS,
  REALTIME_LANG_LABELS,
  SECRET_KEY_NOTE,
  buildRealtimeSnippet,
  type RealtimeLang,
} from "@/lib/studio-snippets";

type Props = {
  slug: string;
  /** Server base URL for the cURL exports (defaults to the local dev URL). */
  serverUrl?: string;
  /** Preselected table. */
  table?: string;
  /** When true the operator can type another table (connect card). */
  tableEditable?: boolean;
  /** Fresh publishable key held by the caller (just rotated), otherwise a placeholder is rendered. */
  publishableKey?: string | null;
};

/** Generated realtime client snippets (JS/TS, Python, cURL). Code is rendered as text only. */
export function RealtimeSnippetPanel({
  slug,
  serverUrl,
  table: initialTable = "records",
  tableEditable = false,
  publishableKey = null,
}: Props) {
  const [lang, setLang] = useState<RealtimeLang>("js");
  const [table, setTable] = useState(initialTable);
  const valid = isRealtimeSubscribeTable(table);

  const code = useMemo(
    () =>
      valid
        ? buildRealtimeSnippet(lang, { table, publishableKey, url: serverUrl, project: slug })
        : "",
    [lang, table, publishableKey, serverUrl, slug, valid],
  );

  return (
    <div className="flex flex-col gap-3">
      <Alert variant="info">
        <AlertDescription>
          {SECRET_KEY_NOTE} Env vars: <code>{ENV_NAMES.url}</code>, <code>{ENV_NAMES.project}</code>,{" "}
          <code>{ENV_NAMES.publishableKey}</code>.
        </AlertDescription>
      </Alert>
      {tableEditable ? (
        <Field label="Table" description="Table to subscribe to (one subscription per connection).">
          <FieldInput value={table} onChange={(e) => setTable(e.target.value)} spellCheck={false} />
        </Field>
      ) : null}
      {!valid ? (
        <p className="text-sm text-muted-foreground" role="status">
          Reserved or invalid table name: pick a user table to generate a snippet.
        </p>
      ) : (
        <Tabs value={lang} onValueChange={(v) => setLang(v as RealtimeLang)}>
          <TabsList aria-label="Snippet language">
            {REALTIME_LANGS.map((l) => (
              <TabsTrigger key={l} value={l}>
                {REALTIME_LANG_LABELS[l]}
              </TabsTrigger>
            ))}
          </TabsList>
          {REALTIME_LANGS.map((l) => (
            <TabsContent key={l} value={l}>
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                  {l === lang ? code : ""}
                </pre>
                <CopyButton value={l === lang ? code : ""} label={`${REALTIME_LANG_LABELS[l]} snippet`} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
