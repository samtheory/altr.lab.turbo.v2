# Security: dependency audit policy

CI blocks merges on known **high** or **critical** advisories in **production**
dependencies (`pnpm audit --prod --audit-level=high`). The policy lives in:

- `scripts/audit-ci.mjs`: the gate (`pnpm audit:ci`)
- `security/audit-allowlist.json`: the only way to accept a finding
- `.github/workflows/audit.yml`: the blocking `audit` job (PR and push to `main`) and the weekly report

## Run it locally

```bash
pnpm audit:ci          # same gate as CI; exits non-zero on failure
pnpm audit:all         # all dependencies incl. dev, report only (what the weekly job runs)
node --test scripts/audit-ci.test.mjs   # unit tests for the gate's pure functions
```

Output ends with `audit:ci PASS` or `audit:ci FAIL`. A failure line starting
with `FAIL (NETWORK)` means pnpm could not reach the registry. That is **not** a
vulnerability finding; re-run when you are online.

## How to triage a finding

1. Read the advisory (the URL is printed with the failure).
2. Check whether the vulnerable code path is reachable in production. Note `pnpm why <package>` shows which workspace pulls it in.
3. Prefer a fix in this order:
   - upgrade the direct dependency that pulls it in;
   - add or bump a pnpm `overrides` entry in the root `package.json` if the vulnerable package is transitive;
   - remove the dependency.
4. Only if no fix exists, or the path is provably unreachable, add an allowlist entry.

## How to add an exception

Add an object to `security/audit-allowlist.json`. **All four fields are mandatory.**

| Field | Rule |
|-------|------|
| `package` | Exact npm package name, e.g. `"postcss"`. |
| `advisory` | A GHSA id (`"GHSA-6g55-p6wh-862q"`) or the numeric advisory number as a string. |
| `reason` | At least 10 characters: why it is unfixed or unreachable, and what would remove the entry. |
| `expires` | `"YYYY-MM-DD"`, at most **90 days** after the date you add it. |

```json
[
  {
    "package": "example-package",
    "advisory": "GHSA-xxxx-xxxx-xxxx",
    "reason": "No patched release yet; only reachable via build-time tooling. Remove when 2.1.0 ships.",
    "expires": "2027-01-31"
  }
]
```

Malformed entries (missing field, bad date, expiry more than 90 days out) fail
the gate and suppress nothing.

## When to remove an entry

- **At expiry.** An entry whose `expires` date is before today fails the gate, and it no longer suppresses anything. Either fix the dependency and delete the entry, or renew it with a new reason and a new date (still at most 90 days out).
- **As soon as a fix is available.** Upgrade, then delete the entry in the same PR.
- **When the advisory is withdrawn or the package is removed.**

Renewing is a conscious decision: put the reason for the renewal in `reason`.

## Scope

- `pnpm audit:ci` covers production dependencies only. Dev-only advisories
  appear in the weekly report (`audit.yml`, `audit-full` job) and never block.
- SAST of source code, license checks and container scanning are out of scope here (see S0092 and the Jord security pass).
