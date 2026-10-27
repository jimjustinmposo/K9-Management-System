import assert from "node:assert/strict";
import { mkdtemp, rm, access, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLogger } from "vite";
import { watchBuild } from "./build-watch.mjs";

const directory = await mkdtemp(join(tmpdir(), "k9-build-watch-"));
const triggerDirectory = await mkdtemp(join(process.cwd(), "public", ".watch-test-"));
const warnings = [];
const logger = createLogger("warn");
const originalWarn = logger.warn;
logger.warn = (message, options) => { warnings.push(message); originalWarn(message, options); };
let watcher;
try {
  await new Promise((resolve, reject) => {
    let builds = 0;
    const timeout = setTimeout(() => reject(new Error("Watch rebuild timed out")), 60000);
    watcher = watchBuild({
      options: {
        customLogger: logger,
        build: { outDir: join(directory, "dist"), emptyOutDir: true },
      },
      onError(error) { clearTimeout(timeout); reject(error); },
      async onBuild(result) {
        try {
        const outputs = Array.isArray(result) ? result : [result];
        for (const output of outputs) for (const asset of output.output) {
          if (asset.type === "chunk") assert.ok(Buffer.byteLength(asset.code) <= 500000, `${asset.fileName} exceeds 500 kB`);
        }
        builds++;
        if (builds === 3) { clearTimeout(timeout); resolve(); }
        else await writeFile(join(triggerDirectory, "trigger.txt"), String(builds));
        } catch (error) { clearTimeout(timeout); reject(error); }
      },
    });
  });
  await access(join(directory, "dist", "index.html"));
  assert.ok(!warnings.some(message => /FILE_NAME_CONFLICT|larger than 500 kB|overwrites a previously emitted/.test(message)), "Build warnings must be resolved, not suppressed");
  console.log("PASS: initial build and two rebuilds without output conflicts or oversized chunks");
} finally {
  await watcher?.close();
  await rm(triggerDirectory, { recursive: true, force: true });
  await rm(directory, { recursive: true, force: true });
}