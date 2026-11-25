export type PromptContext = {
  component: string;
  installName: string;
  docsPath: string;
  jsx: string;
  code?: string;
};

export function buildCopyPrompt(ctx: PromptContext) {
  const docsUrl = `https://apolyx.dev${ctx.docsPath}`;
  return [
    `# Apolyx — ${ctx.component}`,
    "",
    "Use the Apolyx UI kit (`@altr/apolyx` in-monorepo, or `pnpm dlx apolyx add` outside).",
    "",
    "## Install",
    "",
    "```bash",
    `pnpm dlx apolyx add ${ctx.installName}`,
    "```",
    "",
    "## Setup (JSX)",
    "",
    "```tsx",
    ctx.jsx.trim(),
    "```",
    "",
    "## Docs",
    "",
    docsUrl,
    "",
    "Follow semantic tokens only. Do not introduce Radix or Base UI.",
  ].join("\n");
}

export function buildMcpSnippet() {
  return JSON.stringify(
    {
      mcpServers: {
        apolyx: {
          url: "https://apolyx.dev/mcp",
          headers: {},
        },
      },
    },
    null,
    2,
  );
}

export function openAiToolUrl(
  tool: "cursor" | "claude" | "codex" | "v0",
  prompt: string,
): string | null {
  const encoded = encodeURIComponent(prompt);
  switch (tool) {
    case "cursor":
      // Cursor prompt deeplink — falls back to clipboard when unsupported.
      return `cursor://anysphere.cursor-deeplink/prompt?text=${encoded}`;
    case "claude":
      return `https://claude.ai/new?q=${encoded}`;
    case "codex":
      return `https://chatgpt.com/?q=${encoded}`;
    case "v0":
      return `https://v0.dev/?q=${encoded}`;
    default:
      return null;
  }
}
