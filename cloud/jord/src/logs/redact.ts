const TOKENISH =
  /(authorization\s*[:=]\s*)(["']?)Bearer\s+[A-Za-z0-9\-._~+/]+=*\2/gi;
const BEARER = /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWTISH = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const LONG_HEX = /\b[a-f0-9]{32,}\b/gi;

export function redactSecrets(text: string): string {
  return text
    .replace(TOKENISH, "$1$2[redacted]$2")
    .replace(BEARER, "Bearer [redacted]")
    .replace(JWTISH, "[redacted-jwt]")
    .replace(LONG_HEX, "[redacted]");
}

export function redactMeta(
  meta: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/authorization|token|password|secret/i.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string") out[key] = redactSecrets(value);
    else out[key] = value;
  }
  return out;
}
