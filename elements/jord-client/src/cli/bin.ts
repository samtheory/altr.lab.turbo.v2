#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { runCli } from "./run.js";

const code = await runCli(process.argv.slice(2), {
  fetch,
  env: process.env,
  stdout: (t) => void process.stdout.write(t),
  stderr: (t) => void process.stderr.write(t),
  readFile: async (p) => {
    try {
      return await readFile(p, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  },
  writeFile: async (p, c) => {
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, c, "utf8");
  },
});
process.exitCode = code;
