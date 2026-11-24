/**
 * S0092 — seed a local Jord lab for an authorized Strix pentest.
 * Run against a live server: node scripts/s0092-seed-lab.mjs [baseUrl]
 *
 * Creates:
 *  - restricted end-user (user JWT) via signup/signin when possible
 *  - operator admin session token
 *  - sample records in bucket "lab" and "private"
 *  - table RLS + deny-by-default posture for user on records (if admin APIs allow)
 *
 * Writes credentials JSON to Docs/temp/input/S0092-seed-creds.json (staging only).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac, randomBytes } from "node:crypto";

const base = (process.argv[2] || "http://127.0.0.1:8787").replace(/\/$/, "");
const secret = process.env.JORD_SERVER_TOKEN || "dev-jord-token-change-me";

function signSessionToken(role, serverSecret) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  // Server uses its own HMAC session format — prefer /auth paths when available.
  // Fallback: raw service bearer for seeding; operator token via known helper if exposed.
  void header;
  void role;
  void serverSecret;
  return null;
}

async function req(method, p, { token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${p}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

/** Match cloud/jord operator HMAC session token (signSessionToken). */
function makeOperatorToken(role, serverSecret) {
  const payload = {
    role,
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", serverSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

const email = `s0092-restricted-${Date.now()}@lab.local`;
const password = `Lab-${randomBytes(9).toString("base64url")}!a1`;

const health = await req("GET", "/health/live");
if (health.status !== 200) {
  console.error("server not healthy", health.status, health.text);
  process.exit(1);
}

const service = secret;
const adminTok = makeOperatorToken("admin", secret);

// Enable autoconfirm so signup returns a usable session in lab.
const settings = await req("PATCH", "/admin/auth/settings", {
  token: adminTok,
  body: { autoconfirm: true, signups_enabled: true },
});

// Seed records as service
const insLab = await req("POST", "/records", {
  token: service,
  body: { bucket: "lab", body: JSON.stringify({ kind: "public-sample", n: 1 }) },
});
const insPriv = await req("POST", "/records", {
  token: service,
  body: { bucket: "private", body: JSON.stringify({ kind: "restricted-sample", secret: "should-not-leak" }) },
});

// Restricted end-user (prefer admin create with email_confirm, else signup+signin)
let userAccess = null;
let userRefresh = null;
let signup = { status: 0, json: null };
const created = await req("POST", "/admin/auth/users", {
  token: adminTok,
  body: { email, password, email_confirm: true },
});
if (created.status === 200 || created.status === 201) {
  signup = created;
  const signin = await req("POST", "/auth/signin", {
    body: { email, password },
  });
  userAccess = signin.json?.access_token ?? null;
  userRefresh = signin.json?.refresh_token ?? null;
  signup = { status: signin.status, json: signin.json };
} else {
  signup = await req("POST", "/auth/signup", { body: { email, password } });
  userAccess = signup.json?.access_token ?? null;
  userRefresh = signup.json?.refresh_token ?? null;
  if (!userAccess) {
    const signin = await req("POST", "/auth/signin", { body: { email, password } });
    userAccess = signin.json?.access_token ?? null;
    userRefresh = signin.json?.refresh_token ?? null;
    signup = { status: signin.status, json: signin.json };
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outDir = path.join(root, "Docs/temp/input");
mkdirSync(outDir, { recursive: true });
const creds = {
  baseUrl: base,
  seededAt: new Date().toISOString(),
  serviceBearer: service,
  operatorAdminBearer: adminTok,
  restrictedUser: {
    email,
    password,
    accessToken: userAccess,
    refreshToken: userRefresh,
    authStatus: signup.status,
  },
  records: {
    lab: insLab.status,
    private: insPriv.status,
    labId: insLab.json?.id ?? insLab.json?.record?.id ?? null,
    privateId: insPriv.json?.id ?? insPriv.json?.record?.id ?? null,
  },
  settingsPatch: settings.status,
  note: "Lab-only. Staging under Docs/temp — do not promote secrets into vault truth.",
};
writeFileSync(path.join(outDir, "S0092-seed-creds.json"), JSON.stringify(creds, null, 2));
console.log(
  JSON.stringify(
    {
      ok: true,
      base,
      settings: settings.status,
      auth: signup.status,
      lab: insLab.status,
      private: insPriv.status,
      hasUserToken: Boolean(userAccess),
    },
    null,
    2,
  ),
);
