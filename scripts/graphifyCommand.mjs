import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function graphifyPaths(root = resolve(".")) {
  const binDir = process.platform === "win32" ? "Scripts" : "bin";
  const graphifyName = process.platform === "win32" ? "graphify.exe" : "graphify";
  const pythonName = process.platform === "win32" ? "python.exe" : "python";
  const venvBin = join(root, "work", "graphify-venv", binDir);

  return {
    venvBin,
    localGraphify: join(venvBin, graphifyName),
    localPython: join(venvBin, pythonName),
  };
}

export function graphifyCommand(root = resolve(".")) {
  const paths = graphifyPaths(root);
  return existsSync(paths.localGraphify) ? paths.localGraphify : "graphify";
}

export function graphifyEnvironment(root = resolve(".")) {
  const paths = graphifyPaths(root);
  const env = { ...process.env };
  if (existsSync(paths.venvBin)) {
    env.PATH = `${paths.venvBin}${process.platform === "win32" ? ";" : ":"}${env.PATH ?? ""}`;
  }

  return env;
}

export function writeGraphifyPythonHint(root = resolve(".")) {
  const paths = graphifyPaths(root);
  if (!existsSync(paths.localPython)) {
    return;
  }

  const hintPath = join(root, "graphify-out", ".graphify_python");
  mkdirSync(dirname(hintPath), { recursive: true });
  writeFileSync(hintPath, paths.localPython, "utf8");
}

export function runGraphify(args, options = {}) {
  const root = options.root ?? resolve(".");
  writeGraphifyPythonHint(root);
  const command = graphifyCommand(root);
  const result = spawnGraphify(command, args, root, options);

  handleGraphifyError(command, result, options);
  handleGraphifyFailure(command, args, result, options);

  return result;
}

function spawnGraphify(command, args, root, options) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: graphifyEnvironment(root),
    stdio: stdioFor(options),
  });
}

function stdioFor(options) {
  return options.capture ? ["ignore", "pipe", "pipe"] : "inherit";
}

function handleGraphifyError(command, result, options) {
  if (!result.error || options.throwOnError === false) {
    return;
  }

  throw new Error(
    `Unable to run ${command}. Restore the repo-local venv at work/graphify-venv or install graphifyy on PATH.`,
  );
}

function handleGraphifyFailure(command, args, result, options) {
  if (result.status === 0 || options.throwOnFailure === false) {
    return;
  }

  throw new Error(`${command} ${args.join(" ")} exited ${result.status}.`);
}
