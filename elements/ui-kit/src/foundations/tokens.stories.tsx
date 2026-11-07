import type { Meta, StoryObj } from "@storybook/react-vite";

import { cssVariableTokens } from "../theme";

const colorTokens = cssVariableTokens.filter(
  (t) =>
    !t.startsWith("font-") &&
    !t.startsWith("duration-") &&
    !t.startsWith("ease-") &&
    !t.startsWith("shadow-") &&
    t !== "radius",
);

function TokensGrid() {
  return (
    <div className="flex w-[720px] max-w-full flex-col gap-8 text-left">
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Colors</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {colorTokens.map((token) => (
            <div key={token} className="flex flex-col gap-1.5">
              <div
                className="h-12 rounded-md border border-border shadow-sm"
                style={{ background: `var(--${token})` }}
              />
              <code className="text-xs text-muted-foreground">--{token}</code>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Radius</h2>
        <div className="flex flex-wrap gap-3">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <div
              key={size}
              className="flex size-16 items-center justify-center border border-border bg-card text-xs"
              style={{ borderRadius: `var(--radius-${size})` }}
            >
              {size}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Type</h2>
        <p className="font-sans text-base">Satoshi — body / UI</p>
        <p className="font-display text-2xl font-normal tracking-tight">Oldenburg — display / logo</p>
        <p className="font-mono text-sm">JetBrains Mono — code / data</p>
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Shadows</h2>
        <div className="flex flex-wrap gap-4">
          {(["sm", "md", "lg"] as const).map((size) => (
            <div
              key={size}
              className="flex size-20 items-center justify-center rounded-lg bg-card text-xs"
              style={{ boxShadow: `var(--shadow-${size})` }}
            >
              {size}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const meta = {
  title: "Foundations/Tokens",
  component: TokensGrid,
  tags: ["autodocs"],
} satisfies Meta<typeof TokensGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
