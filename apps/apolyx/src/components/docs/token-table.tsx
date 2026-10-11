"use client";

import * as React from "react";
import { cssVariableTokens, useApolyxTheme } from "@altr/apolyx";

const NON_COLOR = /^(radius|font-|duration-|ease-|shadow-)/;

export function TokenTable({ kind = "color" }: { kind?: "color" | "other" }) {
  const { theme, resolvedMode } = useApolyxTheme();
  const tokens = cssVariableTokens.filter((t) =>
    kind === "color" ? !NON_COLOR.test(t) : NON_COLOR.test(t),
  );
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const style = getComputedStyle(document.documentElement);
      setValues(
        Object.fromEntries(tokens.map((t) => [t, style.getPropertyValue(`--${t}`).trim()])),
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [theme, resolvedMode, kind]);

  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <caption className="border-b border-border bg-muted/40 px-4 py-2 text-left text-xs text-muted-foreground">
          Live values for <span className="font-medium text-foreground">{theme}</span> ·{" "}
          <span className="font-medium text-foreground">{resolvedMode}</span>
        </caption>
        <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">Token</th>
            {kind === "color" ? <th scope="col" className="px-4 py-2 font-medium">Swatch</th> : null}
            <th scope="col" className="px-4 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token} className="border-t border-border">
              <td className="px-4 py-2 font-mono text-xs">--{token}</td>
              {kind === "color" ? (
                <td className="px-4 py-2">
                  <span
                    aria-hidden
                    className="block h-6 w-12 rounded-md border border-border"
                    style={{ background: `var(--${token})` }}
                  />
                </td>
              ) : null}
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                {values[token] || "…"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
