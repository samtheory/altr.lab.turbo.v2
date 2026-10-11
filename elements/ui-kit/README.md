# Apolyx UI kit

Package `@altr/apolyx` — shared design system for altr.lab apps: **Tailwind v4**, **Apolyx** components, **theme families × light/dark**, **Motion**, **Storybook**.

## Use in a Next.js app

```tsx
// app/layout.tsx
import { ThemeProvider } from "@altr/apolyx";
import "@altr/apolyx/globals.css";

// next.config.ts
transpilePackages: ["@altr/apolyx"]
```

```css
/* app/globals.css */
@import "@altr/apolyx/globals.css";
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
pnpm --filter @altr/apolyx storybook
pnpm --filter @altr/apolyx build-storybook
```

Add new stories next to components: `src/**/*.stories.tsx`.

## Exports

- Components: `Button`, `Card`, `Badge`, `ThemeProvider`, `ThemeToggle`, `FadeIn`
- Motion: `motion` (from `motion/react`)
- Utils: `cn`
- Theme tokens via CSS variables in `globals.css`

## shadcn

`components.json` points at this package. Add new shadcn components into `src/components/ui/`.
