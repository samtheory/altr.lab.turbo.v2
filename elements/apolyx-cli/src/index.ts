import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import * as p from "@clack/prompts";
import { Command } from "commander";

import {
  addCssImports,
  collectDependencies,
  installDependencies,
  missingDependencies,
  writeItems,
} from "./install";
import {
  CONFIG_FILE,
  defaultAliases,
  detectCssFile,
  detectPackageManager,
  readAtAliasBase,
  readConfig,
  THEMES,
  writeConfig,
  type ApolyxConfig,
  type ThemeFamily,
} from "./project";
import {
  loadItem,
  readRegistryJson,
  resolveTree,
  type RegistryIndexEntry,
} from "./registry";

function resolveRegistry(flag?: string, config?: ApolyxConfig | null) {
  const source =
    flag ||
    config?.registry ||
    process.env.APOLYX_REGISTRY ||
    path.resolve(process.cwd(), "elements/ui-kit/dist/r");
  return /^https?:\/\//.test(source) ? source : path.resolve(source);
}

function bail(message: string): never {
  p.cancel(message);
  process.exit(1);
}

type InstallFlags = {
  overwrite?: boolean;
  yes?: boolean;
  skipInstall?: boolean;
};

async function installItems(
  cwd: string,
  config: ApolyxConfig,
  names: string[],
  flags: InstallFlags,
) {
  const items = await resolveTree(names, (n) => loadItem(config.registry, n));
  const atBase = await readAtAliasBase(cwd);
  const interactive = !flags.yes && process.stdout.isTTY;

  const result = await writeItems(items, {
    cwd,
    config,
    atBase,
    overwrite: Boolean(flags.overwrite),
    confirmOverwrite: interactive
      ? async (file) => {
          const answer = await p.confirm({
            message: `${path.relative(cwd, file)} exists. Overwrite?`,
            initialValue: false,
          });
          return answer === true;
        }
      : undefined,
  });
  for (const file of result.written) p.log.success(`Wrote ${path.relative(cwd, file)}`);
  for (const file of result.skipped) {
    p.log.warn(`Kept existing ${path.relative(cwd, file)} (use --overwrite to replace)`);
  }

  if (await addCssImports(cwd, config, result.cssImports)) {
    p.log.success(`Updated ${config.css} with Apolyx theme imports`);
  }

  const deps = await missingDependencies(cwd, collectDependencies(items));
  const depNames = Object.keys(deps);
  if (depNames.length) {
    if (flags.skipInstall) {
      p.log.info(`Skipped install. Add: ${depNames.join(", ")}`);
    } else {
      const pm = detectPackageManager(cwd);
      const spinner = p.spinner();
      spinner.start(`Installing ${depNames.join(", ")} with ${pm}`);
      const { ok, command } = installDependencies(pm, cwd, deps);
      spinner.stop(ok ? "Dependencies installed" : `Install failed — run: ${command}`);
      if (!ok) process.exitCode = 1;
    }
  }
  return items;
}

const pkgVersion = (() => {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    return (JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string }).version;
  } catch {
    return "0.0.0";
  }
})();

const program = new Command();
program.name("apolyx").description("Apolyx UI kit CLI").version(pkgVersion);

program
  .command("init")
  .description("Write apolyx.json, install utils + theme CSS, and wire the CSS entry")
  .option("--registry <source>", "Registry directory or URL")
  .option("--theme <family>", `Theme family (${THEMES.join(" | ")})`)
  .option("--css <path>", "Tailwind entry CSS file")
  .option("--yes", "Accept defaults without prompting")
  .option("--overwrite", "Overwrite existing files")
  .option("--skip-install", "Do not install npm dependencies")
  .action(
    async (opts: InstallFlags & { registry?: string; theme?: string; css?: string }) => {
      const cwd = process.cwd();
      p.intro("apolyx init");
      if (!existsSync(path.join(cwd, "package.json"))) {
        bail("No package.json here — run inside a project");
      }
      const existing = await readConfig(cwd);

      let theme = (opts.theme ?? existing?.theme) as ThemeFamily | undefined;
      if (theme && !THEMES.includes(theme)) bail(`Unknown theme "${theme}"`);
      if (!theme) {
        if (opts.yes) theme = "default";
        else {
          const picked = await p.select({
            message: "Theme family",
            options: THEMES.map((t) => ({ value: t, label: t })),
            initialValue: "default" as ThemeFamily,
          });
          if (p.isCancel(picked)) bail("Cancelled");
          theme = picked;
        }
      }

      const css = opts.css ?? existing?.css ?? detectCssFile(cwd);
      if (!css) bail("Could not find a Tailwind CSS entry — pass --css <path>");

      const config: ApolyxConfig = {
        aliases: existing?.aliases ?? defaultAliases,
        css,
        theme,
        registry: resolveRegistry(opts.registry, existing),
      };
      await writeConfig(cwd, config);
      p.log.success(`Wrote ${CONFIG_FILE}`);

      const base = ["utils", "theme-config", "theme-default"];
      if (theme !== "default") base.push(`theme-${theme}`);
      await installItems(cwd, config, base, opts);

      const cssSource = readFileSync(path.join(cwd, css), "utf8");
      if (/:root\s*\{[^}]*--(background|foreground)\s*:/.test(cssSource)) {
        p.log.warn(
          `${css} defines its own --background/--foreground on :root, which overrides Apolyx tokens. Remove those starter variables to use the Apolyx palette.`,
        );
      }

      if (theme !== "default") {
        p.note(
          `Set data-theme="${theme}" on <html>, or wrap the app in <ApolyxProvider defaultTheme="${theme}"> (apolyx add theme-provider).`,
          "Theme",
        );
      }
      p.outro("Apolyx ready — try: apolyx add button");
    },
  );

program
  .command("add")
  .description("Add components (and their dependencies) to the project")
  .argument("<names...>", "Registry item names")
  .option("--registry <source>", "Registry directory or URL")
  .option("--overwrite", "Overwrite existing files")
  .option("--yes", "Skip prompts (existing files are kept unless --overwrite)")
  .option("--skip-install", "Do not install npm dependencies")
  .action(async (names: string[], opts: InstallFlags & { registry?: string }) => {
    const cwd = process.cwd();
    p.intro(`apolyx add ${names.join(" ")}`);
    const config = await readConfig(cwd);
    if (!config) bail(`Missing ${CONFIG_FILE} — run apolyx init first`);
    config.registry = resolveRegistry(opts.registry, config);
    const items = await installItems(cwd, config, names, opts);
    const extra = items.length - names.length;
    p.outro(`Added ${names.join(", ")}${extra > 0 ? ` (+${extra} dependencies)` : ""}`);
  });

program
  .command("list")
  .description("List registry items")
  .option("--registry <source>", "Registry directory or URL")
  .option("--type <type>", "Filter by item type")
  .action(async (opts: { registry?: string; type?: string }) => {
    const config = await readConfig(process.cwd());
    const registry = resolveRegistry(opts.registry, config);
    const index = await readRegistryJson<RegistryIndexEntry[]>(registry, "index.json");
    for (const item of index) {
      if (opts.type && item.type !== opts.type) continue;
      console.log(`${item.name.padEnd(24)} ${item.type.padEnd(10)} ${item.description}`);
    }
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  p.log.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
