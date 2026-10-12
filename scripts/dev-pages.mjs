import { spawn, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const pnpmCommand = isWindows ? "pnpm.cmd" : "pnpm";
const wranglerCommand = isWindows ? "wrangler.cmd" : "wrangler";
const initialBuild = spawnSync(pnpmCommand, ["build"], {
  stdio: "inherit",
  shell: isWindows,
});

if (initialBuild.error) {
  console.error("Failed to run the initial Vite build:", initialBuild.error);
  process.exit(1);
}
if (initialBuild.status !== 0) process.exit(initialBuild.status ?? 1);

const children = [
  spawn(pnpmCommand, ["build:watch"], { stdio: "inherit", shell: isWindows }),
  spawn(wranglerCommand, ["pages", "dev", "--port", "8790"], {
    stdio: "inherit",
    shell: isWindows,
  }),
];

let shuttingDown = false;

function stopChildren(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("Failed to start local Pages development process:", error);
    stopChildren(1);
  });
  child.on("exit", (code, signal) => {
    if (!shuttingDown) stopChildren(code ?? (signal ? 1 : 0));
  });
}

process.on("SIGINT", () => stopChildren());
process.on("SIGTERM", () => stopChildren());