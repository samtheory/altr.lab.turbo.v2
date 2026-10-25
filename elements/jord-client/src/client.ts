import { readResponseBody } from "./table-fetch.js";
import { readSse, type SseMessage } from "./sse.js";

export type JordTokens = {
  accessToken: string;
  refreshToken: string | null;
};

export type SignedOutReason = "refresh_reused" | "invalid_refresh" | "unauthorized";

export class JordSignedOutError extends Error {
  readonly reason: SignedOutReason;

  constructor(reason: SignedOutReason) {
    super(reason);
    this.name = "JordSignedOutError";
    this.reason = reason;
  }
}

export type RealtimeSubscribeResult =
  | { status: "live" }
  | { status: "resync"; body: unknown }
  | { status: "http"; statusCode: number; body: unknown };

export type JordClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  tokens?: JordTokens | null;
  onTokens?: (tokens: JordTokens | null, reason?: SignedOutReason) => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tokensFrom(body: unknown): JordTokens {
  if (!isRecord(body) || typeof body.access_token !== "string") {
    throw new JordSignedOutError("invalid_refresh");
  }
  return {
    accessToken: body.access_token,
    refreshToken: typeof body.refresh_token === "string" ? body.refresh_token : null,
  };
}

export class JordClient {
  private tokens: JordTokens | null;
  private refreshFlight: Promise<JordTokens> | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: JordClientOptions) {
    this.tokens = options.tokens ?? null;
    this.fetchImpl = options.fetch ?? fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
  }

  setTokens(tokens: JordTokens | null): void {
    this.tokens = tokens;
  }

  url(path: string): string {
    return `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  }

  async signIn(email: string, password: string): Promise<JordTokens> {
    const res = await this.fetchImpl(this.url("/auth/signin"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await readResponseBody(res);
    if (!res.ok) throw new JordSignedOutError("unauthorized");
    const tokens = tokensFrom(body);
    this.tokens = tokens;
    this.options.onTokens?.(tokens);
    return tokens;
  }

  async refresh(): Promise<JordTokens> {
    if (!this.refreshFlight) {
      this.refreshFlight = this.refreshOnce().finally(() => {
        this.refreshFlight = null;
      });
    }
    return this.refreshFlight;
  }

  async request(path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.tokens?.accessToken && !headers.has("authorization")) {
      headers.set("authorization", `Bearer ${this.tokens.accessToken}`);
    }
    const res = await this.fetchImpl(this.url(path), { ...init, headers });
    if (res.status !== 401 || attempt > 0) return res;
    await this.refresh();
    return this.request(path, init, attempt + 1);
  }

  from(table: string) {
    const path = `/api/v1/${encodeURIComponent(table)}`;
    const json = (init: RequestInit | undefined, body: unknown): RequestInit => {
      const headers = new Headers(init?.headers);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
      return { ...init, headers, body: JSON.stringify(body) };
    };
    return {
      select: (search = "", init?: RequestInit) =>
        this.request(`${path}${normalizeSearch(search)}`, { ...init, method: "GET" }),
      insert: (row: unknown, init?: RequestInit) =>
        this.request(path, { ...json(init, row), method: "POST" }),
      update: (search: string, row: unknown, init?: RequestInit) =>
        this.request(`${path}${normalizeSearch(search)}`, { ...json(init, row), method: "PATCH" }),
      delete: (search: string, init?: RequestInit) =>
        this.request(`${path}${normalizeSearch(search)}`, { ...init, method: "DELETE" }),
    };
  }

  async subscribe(input: {
    table: string;
    since?: number;
    id?: string;
    signal?: AbortSignal;
    onEvent: (message: SseMessage) => void;
  }): Promise<RealtimeSubscribeResult> {
    const params = new URLSearchParams({ table: input.table });
    if (input.since != null) params.set("since", String(input.since));
    if (input.id) params.set("id", input.id);
    const res = await this.request(`/realtime?${params.toString()}`, { signal: input.signal });
    if (res.status === 410) {
      return { status: "resync", body: await readResponseBody(res) };
    }
    if (!res.ok) {
      return { status: "http", statusCode: res.status, body: await readResponseBody(res) };
    }
    await readSse(res, input.onEvent, input.signal);
    return { status: "live" };
  }

  private async refreshOnce(): Promise<JordTokens> {
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) {
      this.signOut("unauthorized");
      throw new JordSignedOutError("unauthorized");
    }
    const res = await this.fetchImpl(this.url("/auth/refresh"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    const body = await readResponseBody(res);
    if (!res.ok) {
      const error = isRecord(body) && typeof body.error === "string" ? body.error : "";
      const reason: SignedOutReason = error === "refresh_reused" ? "refresh_reused" : "invalid_refresh";
      this.signOut(reason);
      throw new JordSignedOutError(reason);
    }
    const tokens = tokensFrom(body);
    this.tokens = tokens;
    this.options.onTokens?.(tokens);
    return tokens;
  }

  private signOut(reason: SignedOutReason): void {
    this.tokens = null;
    this.options.onTokens?.(null, reason);
  }
}

function normalizeSearch(search: string): string {
  if (!search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}
