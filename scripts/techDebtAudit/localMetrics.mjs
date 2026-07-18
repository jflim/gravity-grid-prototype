import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, posix, relative, sep } from "node:path";

export function collectLocalDebtMetrics(options) {
  const root = options.root;
  const includeRoots = options.includeRoots;
  const sourceExtensions = new Set(options.sourceExtensions);
  const ignoredDirs = new Set(options.ignoredDirs);
  const files = includeRoots
    .flatMap((dir) => walk(join(root, dir), sourceExtensions, ignoredDirs))
    .map((filePath) => relativePath(root, filePath))
    .sort();
  const fileSet = new Set(files);
  const metrics = collectFileMetrics({ root, files, fileSet });
  const source = [...metrics.values()].filter((metric) => !metric.isTest);
  const cycles = findCycles(metrics);
  const totalLoc = [...metrics.values()].reduce((sum, metric) => sum + metric.loc, 0);

  return { files, metrics, source, cycles, totalLoc };
}

function walk(dir, sourceExtensions, ignoredDirs) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(child, sourceExtensions, ignoredDirs));
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(child);
    }
  }

  return files;
}

function relativePath(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function resolveImport(fromFile, specifier, fileSet) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    `${base}/index.ts`,
    `${base}/index.js`,
  ];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

function gitOutput(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function gitChurn() {
  const counts = new Map();
  const output = gitOutput("git log --name-only --pretty=format: -- src server shared scripts");
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim().replaceAll("\\", "/");
    if (line) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  return counts;
}

function stripStringLiterals(source) {
  return source
    .replace(/`(?:\\.|[^`])*`/gs, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''");
}

function collectFileMetrics({ root, files, fileSet }) {
  const churn = gitChurn();
  const metrics = new Map();

  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    const lines = source.split(/\r?\n/);
    const importMatches = Array.from(
      source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']|import\(["']([^"']+)["']\)/g),
    );
    const importSpecifiers = importMatches.map((match) => match[1] ?? match[2]);
    const internalImports = [...new Set(importSpecifiers.map((specifier) => resolveImport(file, specifier, fileSet)).filter(Boolean))];
    const codeOnly = stripStringLiterals(source);
    const markers = {
      dom: /document\.|querySelector|innerHTML|addEventListener|HTMLElement|window\./.test(codeOnly),
      phaser: importSpecifiers.includes("phaser") || /Phaser\./.test(codeOnly),
      colyseus: importSpecifiers.some((specifier) => specifier.includes("colyseus")) || /\bColyseus\b/.test(codeOnly),
      schema: importSpecifiers.includes("@colyseus/schema") || /\bSchema\b|type\(/.test(codeOnly),
      filesystem: importSpecifiers.includes("node:fs") || /readFileSync|writeFileSync|readdirSync/.test(codeOnly),
      process: importSpecifiers.includes("node:child_process") || /process\.|spawn|execSync/.test(codeOnly),
    };

    metrics.set(file, {
      file,
      physicalLines: lines.length,
      loc: lines.filter((line) => line.trim()).length,
      internalImports,
      incoming: 0,
      branches: (codeOnly.match(/\b(if|for|while|switch|case|catch)\b|&&|\|\||\?/g) ?? []).length,
      exports: (codeOnly.match(/^\s*export\s+(?:async\s+)?(?:class|function|const|let|var|type|interface|enum)\b/gm) ?? [])
        .length,
      isTest: /\.test\.(ts|tsx|js|mjs)$/.test(file),
      hasSiblingTest: false,
      markers,
      concernCount: Object.values(markers).filter(Boolean).length,
      churn: churn.get(file) ?? 0,
    });
  }

  return scoreMetrics(metrics, fileSet);
}

function scoreMetrics(metrics, fileSet) {
  for (const metric of metrics.values()) {
    for (const dependency of metric.internalImports) {
      metrics.get(dependency).incoming += 1;
    }
  }

  for (const metric of metrics.values()) {
    const siblingTest = metric.file.replace(/\.(ts|tsx|js|mjs)$/, ".test.$1");
    metric.hasSiblingTest = metric.isTest || fileSet.has(siblingTest);
    metric.score = Math.round(
      metric.loc +
        metric.branches * 4 +
        metric.incoming * 7 +
        metric.internalImports.length * 5 +
        metric.concernCount * 25 +
        Math.min(metric.churn, 30) * 3 +
        (!metric.isTest && !metric.hasSiblingTest ? 40 : 0),
    );
  }

  return metrics;
}

function findCycles(metrics) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function visit(file) {
    if (cycles.length >= 20) {
      return;
    }

    visiting.add(file);
    stack.push(file);
    for (const dependency of metrics.get(file).internalImports) {
      if (!metrics.has(dependency)) {
        continue;
      }

      if (visiting.has(dependency)) {
        const start = stack.indexOf(dependency);
        const cycle = [...stack.slice(start), dependency];
        if (!cycles.some((existing) => existing.join(">") === cycle.join(">"))) {
          cycles.push(cycle);
        }
      } else if (!visited.has(dependency)) {
        visit(dependency);
      }
    }
    stack.pop();
    visiting.delete(file);
    visited.add(file);
  }

  for (const file of metrics.keys()) {
    if (!visited.has(file)) {
      visit(file);
    }
  }

  return cycles;
}
