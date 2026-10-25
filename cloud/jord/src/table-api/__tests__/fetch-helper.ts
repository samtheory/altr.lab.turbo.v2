/**
 * Thin fetch helper for the table API. Lives in the S0022 test folder
 * until S0029 promotes it. Must not import @altr/jord.
 */

export type TableFetchResult = {
  status: number;
  body: unknown;
  preferApplied: string | null;
};

export async function tableFetch(
  fetchImpl: typeof fetch,
  url: string,
  init?: RequestInit,
): Promise<TableFetchResult> {
  const res = await fetchImpl(url, init);
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }
  return {
    status: res.status,
    body,
    preferApplied: res.headers.get("preference-applied"),
  };
}
