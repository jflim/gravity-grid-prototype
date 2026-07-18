import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { collectLocalDebtMetrics } from "./techDebtAudit/localMetrics.mjs";
import { metricRows, table } from "./techDebtAudit/markdownTables.mjs";
import {
  fallowDependencyRows,
  fallowFindingRows,
  fallowSummaryRows,
  fallowTargetRows,
  graphifyRows,
  readJsonIfExists,
  topFallowFindings,
} from "./techDebtAudit/toolEvidence.mjs";

const root = resolve(".");
const outputPath = join(root, "docs", "TECH_DEBT_AUDIT.md");
const generatedAt = new Date().toISOString().slice(0, 10);
const sourceLineTarget = 250;
const orchestratorLineTarget = 300;
const graphifyEvidencePath = join(root, "work", "audits", "graphify-diagnose.json");
const fallowFullEvidencePath = join(root, "work", "audits", "fallow-full.json");
const fallowHealthEvidencePath = join(root, "work", "audits", "fallow-health.json");

function relativePath(filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function sortedByRisk(source) {
  return [...source].sort((left, right) => right.score - left.score).slice(0, 12);
}

function sortedBySize(source) {
  return [...source].sort((left, right) => right.loc - left.loc).slice(0, 12);
}

function sortedByCentrality(source) {
  return [...source]
    .sort((left, right) => right.incoming + right.internalImports.length - (left.incoming + left.internalImports.length))
    .slice(0, 12);
}

function sortedByConcernMix(source) {
  return [...source]
    .filter((metric) => metric.concernCount >= 2)
    .sort((left, right) => right.concernCount - left.concernCount || right.loc - left.loc)
    .slice(0, 12);
}

function writeAudit() {
  const local = collectLocalDebtMetrics({
    root,
    includeRoots: ["src", "server", "shared", "scripts"],
    sourceExtensions: [".ts", ".tsx", ".js", ".mjs"],
    ignoredDirs: ["node_modules", "dist", ".git", ".vite", "work", "techDebtAudit"],
  });
  const graphify = readJsonIfExists(graphifyEvidencePath);
  const fallowFull = readJsonIfExists(fallowFullEvidencePath);
  const fallowHealth = readJsonIfExists(fallowHealthEvidencePath);
  const fallowFindings = topFallowFindings(fallowHealth);

  const markdown = `# Gravity Canyon Technical Debt Audit

Generated on ${generatedAt} for the current working tree.

## Tooling Note

This report uses the requested tools:

- **Graphify:** run through the repo-local \`work/graphify-venv\` via \`npm run graphify -- ...\` and \`npm run audit:graphify\`.
- **Fallow:** installed from \`fallow-rs/fallow\` as the npm dev dependency \`fallow\`, then run with \`npm run audit:fallow\`.
- **Fallow changed-files gate:** \`npm run audit:fallow:changed\` runs \`fallow audit --gate all\`, writes \`work/audits/fallow-audit.json\`, and exits nonzero when the current changes are not human-ready.
- **Audit builder:** \`npm run audit:debt\` runs Graphify, runs Fallow, builds this markdown report, then regenerates the HTML docs.

The old local size/coupling score remains in the report as supplemental context, but Graphify and Fallow evidence now drive the top findings.

## Summary

${table(
    ["Metric", "Value"],
    [
      ["App", "Gravity Canyon"],
      ["Files scanned by local supplement", String(local.metrics.size)],
      ["Source files", String(local.source.length)],
      ["Test files", String([...local.metrics.values()].filter((metric) => metric.isTest).length)],
      ["Nonblank LOC scanned", String(local.totalLoc)],
      ["Dependency cycles found", String(local.cycles.length)],
      ["Default source-file target", `${sourceLineTarget} nonblank LOC or less`],
      ["Temporary orchestrator target", `${orchestratorLineTarget} nonblank LOC or less`],
    ],
  )}

## Graphify evidence

Graphify builds the project graph and records structural graph health in \`work/audits/graphify-diagnose.json\`. The generated graph itself stays ignored under \`graphify-out/\` so commits do not churn on local graph cache output.

${table(["Metric", "Value"], graphifyRows(graphify, { root, evidencePath: graphifyEvidencePath }))}

## Fallow evidence

Fallow reports dependency hygiene, circular-dependency status, duplication, hotspots, and function-level complexity. The report is scoped by \`.fallowrc.json\` to source, server, shared, and script code while excluding build output, docs, assets, and vendored browser code.

The raw Fallow JSON keeps all findings. The hotspot and remediation tables below filter out this audit infrastructure so the displayed remediation queue stays focused on app and playtest code.

${table(
    ["Metric", "Value"],
    fallowSummaryRows(fallowFull, fallowHealth, { root, fullPath: fallowFullEvidencePath, healthPath: fallowHealthEvidencePath }),
  )}

### Fallow Dependency Findings

${table(["Package", "Location", "Action"], fallowDependencyRows(fallowFull))}

### Fallow Health Hotspots

${table(["File", "Function", "Line", "Cyclomatic", "Cognitive", "CRAP", "Recommendation"], fallowFindingRows(fallowFindings))}

### Fallow Remediation Targets

${table(["File", "Priority", "Category", "Recommendation"], fallowTargetRows(fallowHealth))}

## Highest Risk Godfile Candidates

This supplemental score combines nonblank LOC, branch proxy, import fan-in/fan-out, concern mixing, git churn, and lack of a sibling test file. It is useful for finding large ownership problems, while Fallow is better for function-level complexity.

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(sortedByRisk(local.source)))}

## Largest Files

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(sortedBySize(local.source)))}

## Graphify-Style Centrality

These files sit on important dependency paths according to the local import graph supplement. Some are healthy shared contracts; others are risky orchestrators.

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(sortedByCentrality(local.source)))}

## Fallow-Style Mixed Concerns

These files combine multiple operational concerns in one file. They are candidates for extraction because touching one reason to change can accidentally disturb another.

${table(["File", "LOC", "Score", "Incoming", "Outgoing", "Branches", "Churn", "Concerns"], metricRows(sortedByConcernMix(local.source)))}

## Cycle Check

${local.cycles.length === 0 ? "No internal import cycles were detected by the local supplement. Fallow also reports zero circular dependencies in the configured source set." : local.cycles.map((cycle) => `- ${cycle.map((file) => `\`${file}\``).join(" -> ")}`).join("\n")}

## Findings

1. **Primary client godfile:** \`src/onlineLobby.ts\` combines Colyseus connection, room-state normalization, DOM template ownership, event binding, rendering, and stage transition. Fallow also flags \`render\`, \`getSnapshot\`, and \`getVehicles\`, so extraction should start here before playtest lobby behavior grows again.
2. **Primary rendering hotspot:** \`src/match/rendering/VehicleRenderer.ts\` is not the largest file, but Fallow identifies \`draw\` as the highest CRAP-risk function. It should be split into named rendering helpers before more sprite and collision-readability work lands.
3. **Primary gameplay godfile:** \`src/match/MatchScene.ts\` remains the largest runtime source file and Fallow flags its \`update\` loop. It already delegates many systems, but it still owns scene lifecycle, input setup, turn flow, projectile advancement, terrain adapter methods, world drawing, and post-motion scheduling.
4. **Primary server godfile:** \`server/rooms/GravityCanyonRoom.ts\` mixes Colyseus message handlers, lobby state synchronization, preview combat setup, preview firing, round rewards, and schema mutation details. Fallow specifically flags \`refreshStatus\`.
5. **Script monoliths:** \`scripts/build-docs-html.mjs\` and \`scripts/verify-runtime-roster.mjs\` are confirmed by Fallow as complexity risks. They are less risky than runtime files, but they should be split because both support repeated agent/human workflows.
6. **Shared combat complexity:** \`shared/gameplay/impact.ts\` and \`shared/gameplay/vehicleSettlement.ts\` are not first-pass godfiles, but Fallow flags core gameplay decision functions. Treat them with characterization tests before changing combat truth.
7. **Dependency hygiene:** Fallow reports \`@colyseus/sdk\` as test-only from package imports. Review whether the production browser SDK path is intentionally served from \`public/vendor/colyseus.js\`; if yes, move the npm package to \`devDependencies\` or add an explicit Fallow ignore with a note.

This audit scans the checked-out working tree, so active uncommitted work can influence metrics. Use \`git status --short\` beside the report when comparing two runs.

## Remediation Queue

Use the detailed SADD remediation plan at \`docs/superpowers/plans/2026-06-16-technical-debt-remediation.md\`.

| Priority | Target | Desired Result |
| --- | --- | --- |
| 1 | \`src/onlineLobby.ts\` | Controller under 180 LOC; snapshot parsing, markup, and DOM rendering in separate tested modules. |
| 2 | \`src/match/rendering/VehicleRenderer.ts\` | \`draw\` split into named helpers with focused tests around sprite/body/collision-zone decisions. |
| 3 | \`src/match/MatchScene.ts\` | Scene under 300 LOC; terrain adapter, shot/update flow, and round flow further separated. |
| 4 | \`server/rooms/GravityCanyonRoom.ts\` | Room under 280 LOC; preview-combat operations and status refresh extracted behind named functions. |
| 5 | \`scripts/build-docs-html.mjs\` and \`scripts/verify-runtime-roster.mjs\` | Split pure parsing/validation from filesystem orchestration. |
| 6 | \`shared/gameplay/impact.ts\` and \`shared/gameplay/vehicleSettlement.ts\` | Add characterization coverage before reducing complex combat decision functions. |

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
