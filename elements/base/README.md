# @altr/base

Shared **framework utilities** for altr.lab apps, cloud services, and other elements.

## Dependency rule (leaf package)

- **`@altr/base` has no dependency** on any other `@altr/*` element (`jord`, `apolyx`, CLI, …).
- **Other packages may depend on** `@altr/base` for shared helpers.
- Prefer **peer elements independent of each other** so a project can add/remove Jord or Apolyx alone.
- Domain code stays in domain packages (DB → `@altr/jord`, UI → `@altr/apolyx`).

Canonical note: `Docs/feature_list/00-elements-dependency-rules.md`.

## Modules

| Export | Path | Role |
|--------|------|------|
| `@altr/base` | `src/index.ts` | Barrel |
| `@altr/base/utils` | `src/utils` | `sleep`, `assert`, `slugify`, `Result` |
| `@altr/base/content` | `src/content` | Markdown-as-data (gray-matter) |
| `@altr/base/env` | `src/env` | Env helpers |
| `@altr/base/errors` | `src/errors` | `AltrError`, `NotFoundError`, … |
| `@altr/base/db` | `src/db` | Stub only — live DB is `@altr/jord` (Jord-S0001 card 7) |
| `@altr/base/auth` | `src/auth` | Auth stub |
| `@altr/base/query` | `src/query` | Query stub |
| `@altr/base/ai` | `src/ai` | AI stub |

## Markdown content

```ts
import { listMarkdownDocuments, getMarkdownBySlug } from "@altr/base/content";

const pages = await listMarkdownDocuments({ dir: "./content" });
const home = await getMarkdownBySlug("./content", "home");
```

Frontmatter + body become the content DB for any app that passes a content directory.
