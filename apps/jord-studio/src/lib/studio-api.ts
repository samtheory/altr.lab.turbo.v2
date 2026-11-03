/** Shared Studio BFF error/time helpers (S0070). */

export async function readStudioError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return (
    parseStudioErrorText(text, response.status) ??
    `Request failed (${response.status})`
  );
}

export function parseStudioErrorText(
  text: string,
  status?: number,
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const body = JSON.parse(trimmed) as {
      message?: unknown;
      error?: unknown;
      detail?: unknown;
      details?: unknown;
    };
    const parts: string[] = [];
    if (typeof body.message === "string" && body.message) {
      parts.push(body.message);
    } else if (typeof body.error === "string" && body.error) {
      parts.push(body.error);
    }
    if (typeof body.detail === "string" && body.detail) {
      parts.push(body.detail);
    }
    if (Array.isArray(body.details)) {
      for (const entry of body.details) {
        if (typeof entry === "string") parts.push(entry);
      }
    }
    if (parts.length > 0) return parts.join(" — ");
  } catch {
    // Plain-text error below.
  }
  const clipped = trimmed.length > 300 ? `${trimmed.slice(0, 300)}…` : trimmed;
  return status ? `${clipped} (${status})` : clipped;
}

export function formatStudioTime(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "—";
  return new Date(ms).toLocaleString();
}
