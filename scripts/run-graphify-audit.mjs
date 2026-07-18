import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { runGraphify } from "./graphifyCommand.mjs";

const root = resolve(".");
const auditsDir = join(root, "work", "audits");
const graphPath = join(root, "graphify-out", "graph.json");
const outputPath = join(auditsDir, "graphify-diagnose.json");

function extractJson(output) {
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Graphify diagnose did not emit JSON.");
  }

  return JSON.parse(output.slice(start, end + 1));
}

mkdirSync(dirname(outputPath), { recursive: true });

runGraphify(["update", ".", "--force", "--no-cluster"], { root });

if (!existsSync(graphPath)) {
  throw new Error("Graphify did not produce graphify-out/graph.json.");
}

const diagnose = runGraphify(["diagnose", "multigraph", "--json", "--graph", graphPath], { root, capture: true });
const payload = extractJson(`${diagnose.stdout}\n${diagnose.stderr}`);
payload.generated_from = "graphify diagnose multigraph --json --graph graphify-out/graph.json";
payload.graph_manifest = existsSync(join(root, "graphify-out", "manifest.json"))
  ? JSON.parse(readFileSync(join(root, "graphify-out", "manifest.json"), "utf8"))
  : null;

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}.`);
