# S0092 agent OWASP probe report

Scanned: 2026-11-24T08:38:54.724Z
Target: http://127.0.0.1:8787 (authorized local lab)
Mode: agent-owasp-api (Composer, no Strix LLM)

| ID | Title | Severity | Status | Detail |
|----|-------|----------|--------|--------|
| BOLA-records | Restricted user cross-record access / owner mass-assign | high | **PASS** | getLab=403 getPriv=403 delPriv=403 patchOwner=403 |
| FLA-admin-manage | User/anon reach admin, function manage, or SQL console | high | **PASS** | userAdmin=403 userFns=403 userFnCreate=403 anonAdmin=401 userSql=403 |
| MASS-signup-role | Signup accepts client-controlled elevated role | high | **PASS** | status=200 roleField=n/a |
| INJ-filter-select | SQL injection via select/filter query params | critical | **PASS** | select=400 filter=200 healthAfter=200 |
| AUTH-jwt-alg-none | alg=none or wrong-secret JWT accepted | critical | **PASS** | algNone=401 wrongSecretAdmin=401 operatorOnRecords=400 |
| AUTH-enum-signin | Sign-in distinguishes unknown email vs bad password | medium | **PASS** | unknown=401:invalid_credentials knownBadPw=401:invalid_credentials |
| BLOB-user-list | End-user listing blob buckets | medium | **PASS** | status=403 |

High/critical FAIL count: **0**