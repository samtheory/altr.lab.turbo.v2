# @altr/hub

Public **landing hub** for altr.lab (`apps/hub`, port **3000**).

## Content = markdown

Pages are loaded from `content/*.md` via `@altr/base/content` (gray-matter frontmatter + body).

```
apps/hub/content/
  home.md
  stack.md
```

Add a new `.md` file → it appears on the hub (and `/docs-preview`).

## Run

```bash
pnpm install
pnpm dev:hub
```

Uses `@altr/ui-kit` (theme, Button, Card, FadeIn/Motion) and `@altr/base`.
