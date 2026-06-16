import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(".");
const auditsDir = join(root, "work", "audits");
const graphPath = join(root, "graphify-out", "graph.json");
const outputPath = join(auditsDir, "graphify-diagnose.json");

function graphifyCommand() {
  const local = join(root, "work", "graphify-venv", process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "graphify.exe" : "graphify");
  return existsSync(local) ? local : "graphify";
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw new Error(
      `Unable to run ${command}. Install Graphify with \`pip install graphifyy\` or restore the repo-local venv at work/graphify-venv.`,
    );
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}.`);
  }

  return result;
}

function extractJson(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Graphify diagnose did not emit JSON.");
  }

  return JSON.parse(output.slice(start, end + 1));
}

mkdirSync(dirname(outputPath), { recursive: true });

const graphify = graphifyCommand();
run(graphify, ["update", ".", "--force", "--no-cluster"]);

if (!existsSync(graphPath)) {
  throw new Error("Graphify did not produce graphify-out/graph.json.");
}

const diagnose = run(graphify, ["diagnose", "multigraph", "--json", "--graph", graphPath], { capture: true });
const payload = extractJson(`${diagnose.stdout}\n${diagnose.stderr}`);
payload.generated_from = "graphify diagnose multigraph --json --graph graphify-out/graph.json";
payload.graph_manifest = existsSync(join(root, "graphify-out", "manifest.json"))
  ? JSON.parse(readFileSync(join(root, "graphify-out", "manifest.json"), "utf8"))
  : null;

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}.`);
