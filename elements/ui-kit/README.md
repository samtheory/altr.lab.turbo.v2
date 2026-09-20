# @altr/ui-kit

Shared design system for altr.lab apps: **Tailwind v4**, **shadcn-style** components, **light/dark** tokens, **Motion**.

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

## Exports

- Components: `Button`, `Card`, `Badge`, `ThemeProvider`, `ThemeToggle`, `FadeIn`
- Motion: `motion` (from `motion/react`)
- Utils: `cn`
- Theme tokens via CSS variables in `globals.css`

## shadcn

`components.json` points at this package. Add new shadcn components into `src/components/ui/`.
