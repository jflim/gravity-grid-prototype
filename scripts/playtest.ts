import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { extractCloudflaredUrl, parsePlaytestArgs } from "../server/playtestLauncher.js";

const options = parsePlaytestArgs(process.argv.slice(2));
const localUrl = `http://${options.host}:${options.port}`;
const children = new Set<ChildProcessWithoutNullStreams>();
let shuttingDown = false;

try {
  if (options.build) {
    await runToCompletion(npmCommand(), ["run", "build"]);
  }

  const server = startManagedProcess(process.execPath, [join("node_modules", "tsx", "dist", "cli.mjs"), "scripts/start-public-preview.ts"], {
    HOST: options.host,
    PORT: String(options.port),
    PUBLIC_PREVIEW: "1",
    SERVE_CLIENT: "1",
    ONLINE_PANEL: "1",
  });

  await waitForHealthz(`${localUrl}/healthz`);
  console.log("");
  console.log(`Gravity Canyon playtest server: ${localUrl}`);

  if (options.tunnel) {
    console.log("Starting Cloudflare quick tunnel...");
    const tunnel = startManagedProcess("cloudflared", ["tunnel", "--url", localUrl], {}, false);
    let printedTunnelUrl = false;
    tunnel.stdout.on("data", (chunk: Buffer) => {
      printedTunnelUrl = printTunnelUrl(chunk.toString(), printedTunnelUrl);
    });
    tunnel.stderr.on("data", (chunk: Buffer) => {
      printedTunnelUrl = printTunnelUrl(chunk.toString(), printedTunnelUrl);
    });
  } else {
    console.log("Tunnel disabled. Share only the local URL above on this computer.");
  }

  console.log("");
  console.log("Press Ctrl+C to stop the playtest server and tunnel.");
  await waitForShutdown();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  await shutdownChildren();
  process.exitCode = 1;
}

function printTunnelUrl(output: string, alreadyPrinted: boolean): boolean {
  process.stdout.write(output);
  const tunnelUrl = extractCloudflaredUrl(output);
  if (!alreadyPrinted && tunnelUrl) {
    console.log("");
    console.log(`Share this playtest URL: ${tunnelUrl}`);
    return true;
  }

  return alreadyPrinted;
}

function startManagedProcess(
  command: string,
  args: string[],
  env: Record<string, string> = {},
  pipeOutput = true,
): ChildProcessWithoutNullStreams {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
  });

  children.add(child);
  if (pipeOutput) {
    child.stdout.on("data", (chunk: Buffer) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  }
  child.on("exit", () => {
    children.delete(child);
  });

  return child;
}

async function runToCompletion(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

async function waitForHealthz(url: string): Promise<void> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still booting.
    }

    await delay(300);
  }

  throw new Error(`Timed out waiting for playtest server at ${url}`);
}

async function waitForShutdown(): Promise<void> {
  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      if (shuttingDown) {
        return;
      }

      shuttingDown = true;
      console.log("");
      console.log("Stopping playtest...");
      await shutdownChildren();
      resolve();
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

async function shutdownChildren(): Promise<void> {
  const activeChildren = Array.from(children);
  for (const child of activeChildren) {
    child.kill("SIGINT");
  }

  await delay(700);

  for (const child of activeChildren) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
