export type SseMessage = {
  event: string;
  data: unknown;
};

export function parseSseBlock(raw: string): SseMessage | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  if (dataLines.length === 0) return null;
  const text = dataLines.join("\n");
  let data: unknown = text;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    data = text;
  }
  return { event, data };
}

export async function readSse(
  res: Response,
  onEvent: (message: SseMessage) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (!signal?.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let split = buf.indexOf("\n\n");
      while (split >= 0) {
        const parsed = parseSseBlock(buf.slice(0, split));
        buf = buf.slice(split + 2);
        if (parsed) onEvent(parsed);
        split = buf.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
