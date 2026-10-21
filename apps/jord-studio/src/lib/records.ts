export type PublicRecord = {
  id: string;
  bucket: string;
  body: string;
  metadata: string | null;
  created_at: number;
  updated_at: number;
  version: number;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export function previewBody(body: string, max = 72): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1)}…`;
}

export function formatMs(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}
