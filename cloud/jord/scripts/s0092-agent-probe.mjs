/**
 * S0092 — agent-driven OWASP API probes against local lab (no Strix LLM).
 * Usage: node scripts/s0092-agent-probe.mjs
 * Reads Docs/temp/input/S0092-seed-creds.json; writes Docs/temp/output/S0092-strix/agent-probe-report.json
 * Does not print raw tokens.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const credsPath = path.join(root, "Docs/temp/input/S0092-seed-creds.json");
const outDir = path.join(root, "Docs/temp/output/S0092-strix");
const creds = JSON.parse(readFileSync(credsPath, "utf8"));
const base = (creds.baseUrl || "http://127.0.0.1:8787").replace(/\/$/, "");
const service = creds.serviceBearer;
const admin = creds.operatorAdminBearer;
const user = creds.restrictedUser?.accessToken;
const labId = creds.records?.labId;
const privateId = creds.records?.privateId;
const findings = [];
const evidence = [];

function note(id, title, severity, status, detail) {
  findings.push({ id, title, severity, status, detail });
}

async function req(method, p, { token, body, rawBody, headers: extra } = {}) {
  const headers = { ...(extra || {}) };
  if (token) headers.authorization = `Bearer ${token}`;
  let bodyInit;
  if (rawBody !== undefined) {
    bodyInit = rawBody;
  } else if (body !== undefined) {
    headers["content-type"] = "application/json";
    bodyInit = JSON.stringify(body);
  }
  const res = await fetch(`${base}${p}`, { method, headers, body: bodyInit });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  const row = {
    method,
    path: p,
    status: res.status,
    principal: token === service ? "service" : token === admin ? "admin" : token === user ? "user" : token ? "other" : "none",
    snippet: text.slice(0, 220).replace(/\s+/g, " "),
  };
  evidence.push(row);
  return { status: res.status, json, text, headers: res.headers };
}

function b64urlJson(v) {
  return Buffer.from(JSON.stringify(v), "utf8").toString("base64url");
}

function forgeAlgNone(claims) {
  return `${b64urlJson({ alg: "none", typ: "JWT" })}.${b64urlJson(claims)}.`;
}

function forgeWrongAlgHs256(claims, secret) {
  const h = b64urlJson({ alg: "HS256", typ: "JWT", kid: "current" });
  const p = b64urlJson(claims);
  const sig = createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}

// --- probes ---
const health = await req("GET", "/health/live");
if (health.status !== 200) {
  console.error("lab not healthy", health.status);
  process.exit(1);
}
if (!user) {
  console.error("missing restricted user token — re-seed with JORD_JWT_SECRET");
  process.exit(1);
}

// 1) BOLA on records
const userGetLab = await req("GET", `/records/${labId}`, { token: user });
const userGetPriv = await req("GET", `/records/${privateId}`, { token: user });
const userDelPriv = await req("DELETE", `/records/${privateId}`, { token: user });
const userPatchOwner = await req("PATCH", `/records/${privateId}`, {
  token: user,
  body: { body: JSON.stringify({ pwned: true }), owner: "attacker", version: 1 },
});
const bolaLeak =
  (userGetPriv.status === 200 && /should-not-leak|restricted-sample/.test(userGetPriv.text)) ||
  userDelPriv.status === 200 ||
  userPatchOwner.status === 200;
note(
  "BOLA-records",
  "Restricted user cross-record access / owner mass-assign",
  "high",
  bolaLeak ? "FAIL" : "PASS",
  `getLab=${userGetLab.status} getPriv=${userGetPriv.status} delPriv=${userDelPriv.status} patchOwner=${userPatchOwner.status}`,
);

// 2) Function-level authz
const userAdmin = await req("GET", "/admin/auth/settings", { token: user });
const userFns = await req("GET", "/functions", { token: user });
const userFnCreate = await req("POST", "/functions", {
  token: user,
  body: { name: "x", slug: "s0092-pwn", steps: '[{"kind":"echo"}]' },
});
const anonAdmin = await req("GET", "/admin/projects");
const userSql = await req("POST", "/sql/query", {
  token: user,
  body: { sql: "select 1" },
});
const fla =
  userAdmin.status === 200 ||
  userFns.status === 200 ||
  userFnCreate.status < 300 ||
  anonAdmin.status === 200 ||
  (userSql.status === 200 && Array.isArray(userSql.json?.rows));
note(
  "FLA-admin-manage",
  "User/anon reach admin, function manage, or SQL console",
  "high",
  fla ? "FAIL" : "PASS",
  `userAdmin=${userAdmin.status} userFns=${userFns.status} userFnCreate=${userFnCreate.status} anonAdmin=${anonAdmin.status} userSql=${userSql.status}`,
);

// 3) Mass assignment on signup / admin user create surface (user cannot create admin)
const massSignup = await req("POST", "/auth/signup", {
  body: {
    email: `s0092-mass-${Date.now()}@lab.local`,
    password: "Lab-MassAssign!a1",
    role: "admin",
    app_metadata: { role: "admin" },
    user_metadata: { role: "service" },
  },
});
const massRole =
  massSignup.json?.user?.role === "admin" ||
  massSignup.json?.access_token && /"role":"admin"/.test(
    Buffer.from(String(massSignup.json.access_token).split(".")[1] || "", "base64url").toString("utf8"),
  );
note(
  "MASS-signup-role",
  "Signup accepts client-controlled elevated role",
  "high",
  massRole ? "FAIL" : massSignup.status >= 400 && massSignup.status !== 403 && massSignup.status !== 409 ? "INFO" : "PASS",
  `status=${massSignup.status} roleField=${massSignup.json?.user?.role ?? massSignup.json?.role ?? "n/a"}`,
);

// 4) Injection via filters/select (table API if exposed; else records list)
const injSelect = await req(
  "GET",
  "/records?select=" + encodeURIComponent('id,body");DROP TABLE jord_records;--'),
  { token: service },
);
const injFilter = await req(
  "GET",
  "/records?bucket=" + encodeURIComponent("lab' OR '1'='1"),
  { token: service },
);
const stillAlive = await req("GET", "/health/live");
const injBreak = stillAlive.status !== 200;
note(
  "INJ-filter-select",
  "SQL injection via select/filter query params",
  "critical",
  injBreak ? "FAIL" : "PASS",
  `select=${injSelect.status} filter=${injFilter.status} healthAfter=${stillAlive.status}`,
);

// 5) Auth flaws — alg=none + operator token as user path
const noneTok = forgeAlgNone({
  iss: "jord",
  aud: "jord",
  sub: "attacker",
  role: "user",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});
const noneHit = await req("GET", "/records", { token: noneTok });
const forgedUser = forgeWrongAlgHs256(
  {
    iss: "jord",
    aud: "jord",
    sub: "forged",
    role: "admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  "wrong-secret",
);
const forgedHit = await req("GET", "/admin/auth/settings", { token: forgedUser });
const operatorAsUserSurface = await req("GET", "/records", { token: admin });
note(
  "AUTH-jwt-alg-none",
  "alg=none or wrong-secret JWT accepted",
  "critical",
  noneHit.status === 200 || forgedHit.status === 200 ? "FAIL" : "PASS",
  `algNone=${noneHit.status} wrongSecretAdmin=${forgedHit.status} operatorOnRecords=${operatorAsUserSurface.status}`,
);

// 6) Auth enumeration — signup vs signin response shape for unknown emails
const enumA = await req("POST", "/auth/signin", {
  body: { email: "nobody-s0092@lab.local", password: "wrong" },
});
const enumB = await req("POST", "/auth/signin", {
  body: { email: creds.restrictedUser.email, password: "wrong-password-zzz" },
});
const enumDiff =
  enumA.status !== enumB.status ||
  (enumA.json?.error && enumB.json?.error && enumA.json.error !== enumB.json.error);
note(
  "AUTH-enum-signin",
  "Sign-in distinguishes unknown email vs bad password",
  "medium",
  enumDiff ? "FAIL" : "PASS",
  `unknown=${enumA.status}:${enumA.json?.error ?? ""} knownBadPw=${enumB.status}:${enumB.json?.error ?? ""}`,
);

// 7) Unauth sensitive surfaces
const openPaths = ["/metrics", "/openapi.json", "/admin/projects", "/blobs/buckets", "/functions"];
for (const p of openPaths) {
  const r = await req("GET", p);
  if (r.status === 200) {
    note("OPEN-" + p, `Unauthenticated 200 on ${p}`, "high", "FAIL", `status=200`);
  }
}

// 8) Service vs user on blobs if buckets exist
const userBlobs = await req("GET", "/blobs/buckets", { token: user });
note(
  "BLOB-user-list",
  "End-user listing blob buckets",
  "medium",
  userBlobs.status === 200 ? "FAIL" : "PASS",
  `status=${userBlobs.status}`,
);

mkdirSync(outDir, { recursive: true });
const summary = {
  scannedAt: new Date().toISOString(),
  base,
  mode: "agent-owasp-api (Composer, no Strix LLM)",
  counts: {
    fail: findings.filter((f) => f.status === "FAIL").length,
    pass: findings.filter((f) => f.status === "PASS").length,
    info: findings.filter((f) => f.status === "INFO").length,
    highCriticalFail: findings.filter(
      (f) => f.status === "FAIL" && (f.severity === "high" || f.severity === "critical"),
    ).length,
  },
  findings,
  evidence,
};
writeFileSync(path.join(outDir, "agent-probe-report.json"), JSON.stringify(summary, null, 2));

const md = [
  "# S0092 agent OWASP probe report",
  "",
  `Scanned: ${summary.scannedAt}`,
  `Target: ${base} (authorized local lab)`,
  `Mode: ${summary.mode}`,
  "",
  `| ID | Title | Severity | Status | Detail |`,
  `|----|-------|----------|--------|--------|`,
  ...findings.map(
    (f) => `| ${f.id} | ${f.title} | ${f.severity} | **${f.status}** | ${f.detail.replace(/\|/g, "/")} |`,
  ),
  "",
  `High/critical FAIL count: **${summary.counts.highCriticalFail}**`,
].join("\n");
writeFileSync(path.join(outDir, "agent-probe-report.md"), md);

console.log(
  JSON.stringify(
    {
      ok: true,
      highCriticalFail: summary.counts.highCriticalFail,
      fail: summary.counts.fail,
      pass: summary.counts.pass,
      findings: findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        status: f.status,
        detail: f.detail,
      })),
      report: "Docs/temp/output/S0092-strix/agent-probe-report.md",
    },
    null,
    2,
  ),
);
process.exit(summary.counts.highCriticalFail > 0 ? 2 : 0);
