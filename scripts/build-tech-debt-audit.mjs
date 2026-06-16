import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, posix, relative, resolve, sep } from "node:path";

const root = resolve(".");
const outputPath = join(root, "docs", "TECH_DEBT_AUDIT.md");
const generatedAt = new Date().toISOString().slice(0, 10);
const includeRoots = ["src", "server", "shared", "scripts"];
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const ignoredDirs = new Set(["node_modules", "dist", ".git", ".vite", "work"]);
const sourceLineTarget = 250;
const orchestratorLineTarget = 300;

function walk(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(child));
      }
      continue;
    }

    if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(child);
    }
  }

  return files;
}

function relativePath(filePath) {
  return relative(root, filePath).split(sep).join("/");
}

const files = includeRoots
  .flatMap((dir) => walk(join(root, dir)))
  .map(relativePath)
  .sort();
const fileSet = new Set(files);

function resolveImport(fromFile, specifier) {
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

function collectFileMetrics() {
  const churn = gitChurn();
  const metrics = new Map();

  for (const file of files) {
    const source = readFileSync(join(root, file), "utf8");
    const lines = source.split(/\r?\n/);
    const importMatches = Array.from(
      source.matchAll(/(?:import|export)\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']|import\(["']([^"']+)["']\)/g),
    );
    const importSpecifiers = importMatches.map((match) => match[1] ?? match[2]);
    const internalImports = [...new Set(importSpecifiers.map((specifier) => resolveImport(file, specifier)).filter(Boolean))];
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

function sourceFiles(metrics) {
  return [...metrics.values()].filter((metric) => !metric.isTest);
}

function concerns(metric) {
  const labels = Object.entries(metric.markers)
    .filter(([, enabled]) => enabled)
    .map(([label]) => label);
  return labels.length ? labels.join(", ") : "pure/data";
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function metricRows(metrics) {
  return metrics.map((metric) => [
    `\`${metric.file}\``,
    String(metric.loc),
    String(metric.score),
    String(metric.incoming),
    String(metric.internalImports.length),
    String(metric.branches),
    String(metric.churn),
    concerns(metric),
  ]);
}

function writeAudit() {
  const metrics = collectFileMetrics();
  const source = sourceFiles(metrics);
  const cycles = findCycles(metrics);
  const largest = [...source].sort((left, right) => right.loc - left.loc).slice(0, 12);
  const riskiest = [...source].sort((left, right) => right.score - left.score).slice(0, 12);
  const central = [...source]
    .sort((left, right) => right.incoming + right.internalImports.length - (left.incoming + left.internalImports.length))
    .slice(0, 12);
  const mixed = [...source]
    .filter((metric) => metric.concernCount >= 2)
    .sort((left, right) => right.concernCount - left.concernCount || right.loc - left.loc)
    .slice(0, 12);

  const totalLoc = [...metrics.values()].reduce((sum, metric) => sum + metric.loc, 0);
  const godfiles = riskiest.filter((metric) => metric.loc >= orchestratorLineTarget || metric.score >= 700);

  const markdown = `# Gravity Canyon Technical Debt Audit

Generated on ${generatedAt} for the current working tree.

## Tooling Note

The request named Graphify and Fallow. They are not installed in this repository, not exposed as Codex tools, and not available as installable plugins in this session. This report therefore uses a local replacement:

- **Graphify-style pass:** relative import graph, incoming dependencies, outgoing dependencies, and cycle detection.
- **Fallow-style pass:** file size, branch-density proxy, mixed-concern markers, git churn, and missing sibling-test flags.

If Graphify or Fallow become available later, rerun this audit with those tools and compare their findings against this baseline.

## Summary

${table(
    ["Metric", "Value"],
    [
      ["App", "Gravity Canyon"],
      ["Files scanned", String(metrics.size)],
      ["Source files", String(source.length)],
      ["Test files", String([...metrics.values()].filter((metric) => metric.isTest).length)],
      ["Nonblank LOC scanned", String(totalLoc)],
      ["Dependency cycles found", String(cycles.length)],
      ["Default source-file target", `${sourceLineTarget} nonblank LOC or less`],
      ["Temporary orchestrator target", `${orchestratorLineTarget} nonblank LOC or less`],
    ],
  )}

## Highest Risk Godfile Candidates

Risk score combines nonblank LOC, branch proxy, import fan-in/fan-out, concern mixing, git churn, and lack of a sibling test file. Scores are directional, not a replacement for code review.

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(riskiest))}

## Largest Files

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(largest))}

## Graphify-Style Centrality

These files sit on important dependency paths. Some are healthy shared contracts; others are risky orchestrators.

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(central))}

## Fallow-Style Mixed Concerns

These files combine multiple operational concerns in one file. They are candidates for extraction because touching one reason to change can accidentally disturb another.

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(mixed))}

## Cycle Check

${cycles.length === 0 ? "No internal import cycles were detected." : cycles.map((cycle) => `- ${cycle.map((file) => `\`${file}\``).join(" -> ")}`).join("\n")}

## Findings

1. **Primary client godfile:** \`src/onlineLobby.ts\` combines Colyseus connection, room-state normalization, DOM template ownership, event binding, rendering, and stage transition. This is the most urgent human-handoff issue because lobby behavior is currently changing quickly.
2. **Primary gameplay godfile:** \`src/match/MatchScene.ts\` remains the largest product source file. It already delegates many systems, but it still owns scene lifecycle, input setup, turn flow, projectile advancement, terrain adapter methods, world drawing, and post-motion scheduling.
3. **Primary server godfile:** \`server/rooms/GravityCanyonRoom.ts\` mixes Colyseus message handlers, lobby state synchronization, preview combat setup, preview firing, round rewards, and schema mutation details.
4. **Script monoliths:** \`scripts/build-docs-html.mjs\`, \`scripts/build-map-previews.ts\`, and \`scripts/verify-runtime-roster.mjs\` are useful but large. They are less risky than runtime files, but they should be split if they become frequent edit targets.
5. **Healthy shared cores:** \`shared/gameplay/*\`, \`src/match/*Controller.ts\`, and \`src/*Presentation.ts\` files are generally smaller and better tested. They should be protected as stable boundaries.

This audit scans the checked-out working tree, so active uncommitted work can influence metrics. Use \`git status --short\` beside the report when comparing two runs.

## Remediation Queue

Use the detailed SADD remediation plan at \`docs/superpowers/plans/2026-06-16-technical-debt-remediation.md\`.

| Priority | Target | Desired Result |
| --- | --- | --- |
| 1 | \`src/onlineLobby.ts\` | Controller under 180 LOC; snapshot parsing, markup, and DOM rendering in separate tested modules. |
| 2 | \`server/rooms/GravityCanyonRoom.ts\` | Room under 280 LOC; preview-combat operations extracted behind named functions. |
| 3 | \`src/match/MatchScene.ts\` | Scene under 300 LOC; terrain adapter, shot/update flow, and round flow further separated. |
| 4 | \`scripts/build-docs-html.mjs\` | Build entry under 120 LOC; markdown renderer and docs index writer in separate modules. |
| 5 | \`scripts/build-map-previews.ts\` and \`scripts/verify-runtime-roster.mjs\` | Split pure rendering/validation from filesystem orchestration if they keep changing. |

## Contribution Guardrails

- A feature contribution should not add new responsibilities to an existing godfile.
- If a changed file exceeds ${sourceLineTarget} nonblank LOC, the commit should explain why it remains a single unit.
- New extraction files need one clear owner sentence at the top of the plan or commit message.
- Prefer tests at the new boundary before moving behavior.
- Keep generated/data-heavy files separate from orchestrators so large data does not hide large behavior.
`;

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, markdown, "utf8");
  console.log(`Generated ${relativePath(outputPath)}.`);
}

writeAudit();
