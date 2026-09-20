# @altr/base

Shared framework utilities for all altr.lab apps and cloud services.

## Modules

| Export | Path | Role |
|--------|------|------|
| `@altr/base` | `src/index.ts` | Barrel |
| `@altr/base/utils` | `src/utils` | `sleep`, `assert`, `slugify`, `Result` |
| `@altr/base/content` | `src/content` | Markdown-as-data (gray-matter) |
| `@altr/base/env` | `src/env` | Env helpers (Turso keys) |
| `@altr/base/errors` | `src/errors` | `AltrError`, `NotFoundError`, … |
| `@altr/base/db` | `src/db` | Turso/libSQL client stub |
| `@altr/base/auth` | `src/auth` | Auth stub |
| `@altr/base/query` | `src/query` | Query stub |
| `@altr/base/ai` | `src/ai` | AI stub |

## Markdown content

```ts
import { listMarkdownDocuments, getMarkdownBySlug } from "@altr/base/content";

const pages = await listMarkdownDocuments({ dir: "./content" });
const home = await getMarkdownBySlug("./content", "home");
```

Frontmatter + body become the content DB for apps like `@altr/hub`.
