# @altr/ui-kit

Shared UI package for altr.lab apps: **Tailwind v4**, **shadcn-style components**, and **light/dark CSS tokens**.

## Usage in Next.js apps

1. Depend on `@altr/ui-kit` in the app `package.json`.
2. Import styles once in the root layout:

```tsx
import "@altr/ui-kit/globals.css";
```

3. Wrap the app with `ThemeProvider`:

```tsx
import { ThemeProvider } from "@altr/ui-kit";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

4. Use components:

```tsx
import { Button, Card, ThemeToggle } from "@altr/ui-kit";
```

5. Ensure the Next.js config transpiles the package:

```js
transpilePackages: ["@altr/ui-kit"];
```

## Adding shadcn components

`components.json` points at this package. From the ui-kit directory (or with `-c` path), run shadcn CLI so new components land under `src/components/ui`.

## Tokens

Light/dark HSL CSS variables live in `src/styles/globals.css`. Apps inherit them via the imported stylesheet; do not redefine tokens per app unless intentionally overriding.
