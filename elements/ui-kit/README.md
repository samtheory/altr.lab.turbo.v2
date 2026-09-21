# @altr/ui-kit

Shared design system for altr.lab apps: **Tailwind v4**, **shadcn-style** components, **light/dark** tokens, **Motion**, **Storybook**.

## Use in a Next.js app

```tsx
// app/layout.tsx
import { ThemeProvider } from "@altr/ui-kit";
import "@altr/ui-kit/globals.css";

// next.config.ts
transpilePackages: ["@altr/ui-kit"]
```

```css
/* app/globals.css */
@import "@altr/ui-kit/globals.css";
@source "../";
```

## Storybook

From the repo root:

```bash
pnpm storybook:ui-kit
```

Opens **http://localhost:6006** — stories for Button, Card, Badge, ThemeToggle, FadeIn. Use the toolbar theme switch (light/dark).

```bash
pnpm build:storybook:ui-kit   # static build → elements/ui-kit/storybook-static
```

Or from this package:

```bash
pnpm --filter @altr/ui-kit storybook
pnpm --filter @altr/ui-kit build-storybook
```

Add new stories next to components: `src/**/*.stories.tsx`.

## Exports

- Components: `Button`, `Card`, `Badge`, `ThemeProvider`, `ThemeToggle`, `FadeIn`
- Motion: `motion` (from `motion/react`)
- Utils: `cn`
- Theme tokens via CSS variables in `globals.css`

## shadcn

`components.json` points at this package. Add new shadcn components into `src/components/ui/`.
