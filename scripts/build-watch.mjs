import { watch } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";

// Vite 8.0.5 / Rolldown rc.12 retain emitted assets across native watch
// rebuilds. Fresh builds avoid those collisions without filtering warnings.
export function watchBuild({ root = process.cwd(), options = {}, onBuild = () => {}, onError = console.error } = {}) {
  let closed = false;
  let pending = false;
  let running;
  let timer;
  const watchers = [];

  async function drain() {
    while (pending && !closed) {
      pending = false;
      try {
        const result = await build({ ...options, root, build: { ...options.build, watch: null } });
        await onBuild(result);
      } catch (error) {
        onError(error);
      }
    }
  }

  function requestBuild() {
    if (closed) return;
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!running) running = drain().finally(() => { running = undefined; });
    }, 100);
  }

  try {
    // Watch directories rather than individual files so atomic editor saves,
    // additions and deletions are observed. Never watch generated output.
    for (const directory of ["src", "public", ".figma/make"]) {
      watchers.push(watch(resolve(root, directory), { recursive: true }, requestBuild));
    }
    watchers.push(watch(root, (_event, filename) => {
      if (filename && /^(index\.html|vite\.config\.[cm]?[jt]s|tsconfig.*\.json|package\.json|pnpm-lock\.yaml|\.env(?:\..*)?)$/.test(String(filename))) requestBuild();
    }));
    for (const watcher of watchers) watcher.on("error", onError);
  } catch (error) {
    for (const watcher of watchers) watcher.close();
    throw error;
  }
  requestBuild();
  return {
    requestBuild,
    async close() {
      closed = true;
      clearTimeout(timer);
      for (const watcher of watchers) watcher.close();
      await running;
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const watcher = watchBuild();
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void watcher.close());
}