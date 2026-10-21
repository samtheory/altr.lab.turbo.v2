"use client";

import {
  Field,
  FieldInput,
  FieldTextarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@altr/apolyx";

import { RECORD_BUCKETS } from "@/lib/studio-nav";
import { formatMs, type PublicRecord } from "@/lib/records";

type SharedProps = {
  bucket: string;
  onBucketChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
  metadata: string;
  onMetadataChange: (value: string) => void;
  validateJson: boolean;
  onValidateJsonChange: (value: boolean) => void;
  bodyError?: string | null;
};

type InsertProps = SharedProps & {
  mode: "insert";
  record?: undefined;
};

type EditProps = SharedProps & {
  mode: "edit";
  record: PublicRecord;
};

export type RecordRowFieldsProps = InsertProps | EditProps;

export function RecordRowFields(props: RecordRowFieldsProps) {
  const {
    mode,
    bucket,
    onBucketChange,
    body,
    onBodyChange,
    metadata,
    onMetadataChange,
    validateJson,
    onValidateJsonChange,
    bodyError,
  } = props;

  return (
    <div className="flex flex-col gap-5">
      {mode === "edit" ? (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
          <ServerCol name="id" value={props.record.id} mono />
          <ServerCol name="version" value={String(props.record.version)} mono />
          <ServerCol name="created_at" value={formatMs(props.record.created_at)} />
          <ServerCol name="updated_at" value={formatMs(props.record.updated_at)} />
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          Server sets <code className="font-mono text-foreground">id</code>,{" "}
          <code className="font-mono text-foreground">created_at</code>,{" "}
          <code className="font-mono text-foreground">updated_at</code>, and{" "}
          <code className="font-mono text-foreground">version</code> (= 1) on insert.
        </div>
      )}

      <Field label="bucket" description="SQL column · TEXT · required" required>
        <Select value={bucket} onValueChange={onBucketChange}>
          <SelectTrigger>
            <SelectValue placeholder="bucket" />
          </SelectTrigger>
          <SelectContent>
            {RECORD_BUCKETS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="body"
        description="SQL column · TEXT. Often a JSON string for scratchpad; plain text is valid."
        required
        error={bodyError ?? undefined}
      >
        <FieldTextarea
          rows={10}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          className="font-mono text-sm"
          placeholder='e.g. {"note":"hello"} or any text'
        />
      </Field>

      <div className="flex items-center gap-3">
        <Switch
          id="validate-json"
          checked={validateJson}
          onCheckedChange={onValidateJsonChange}
        />
        <Label htmlFor="validate-json" className="text-sm font-normal">
          Validate <code className="font-mono">body</code> as JSON before save
        </Label>
      </div>

      <Field label="metadata" optional description="SQL column · TEXT nullable">
        <FieldInput
          value={metadata}
          onChange={(e) => onMetadataChange(e.target.value)}
          placeholder="null if empty"
          className="font-mono text-sm"
        />
      </Field>
    </div>
  );
}

function ServerCol({
  name,
  value,
  mono,
}: {
  name: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-xs text-muted-foreground">{name}</dt>
      <dd className={`mt-0.5 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

/** Returns an error message if validateJson is on and body is not JSON; else null. */
export function validateBodyJson(body: string, validateJson: boolean): string | null {
  if (!validateJson) return null;
  try {
    JSON.parse(body);
    return null;
  } catch {
    return "body is not valid JSON. Fix it or turn off “Validate as JSON”.";
  }
}
