import { resolve } from "node:path";
import { runGraphify } from "./graphifyCommand.mjs";

const root = resolve(".");

const result = runGraphify(["hook-check"], { root, throwOnError: false, throwOnFailure: false });

if (result.error?.code === "ENOENT") {
  console.warn("Graphify hook skipped: Graphify CLI is not installed. Install graphifyy to enable hook checks.");
  process.exit(0);
}

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
