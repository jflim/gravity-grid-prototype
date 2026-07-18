import { existsSync, readFileSync } from "node:fs";
import { relative, sep } from "node:path";

const auditToolingPaths = [
  "scripts/build-tech-debt-audit.mjs",
  "scripts/graphifyCommand.mjs",
  "scripts/run-fallow-audit.mjs",
  "scripts/run-graphify-audit.mjs",
  "scripts/run-graphify-hook-check.mjs",
  "scripts/techDebtAudit/",
];

export function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    return { parseError: error.message };
  }
}

export function graphifyRows(graphify, paths) {
  const unavailableRows = graphifyUnavailableRows(graphify, paths);
  if (unavailableRows) {
    return unavailableRows;
  }

  return [
    ["Evidence file", `\`${relativePath(paths.root, paths.evidencePath)}\``],
    ["Graph file", "`graphify-out/graph.json`"],
    ["Graphify source command", "`npm run graphify -- update . --force --no-cluster`"],
    ["Diagnose command", "`npm run graphify -- diagnose multigraph --json --graph graphify-out/graph.json`"],
    ...graphifyMetricRows(graphify.summary ?? graphify),
  ];
}

export function fallowSummaryRows(fallowFull, fallowHealth, paths) {
  const unavailableRows = fallowUnavailableRows(fallowFull, paths);
  if (unavailableRows) {
    return unavailableRows;
  }

  return fallowAvailableSummaryRows(fallowFull, fallowHealth, paths);
}

function fallowAvailableSummaryRows(fallowFull, fallowHealth, paths) {
  const summary = fallowSummary(fallowFull);
  return [
    ["Evidence files", fallowEvidenceFiles(paths)],
    ["Fallow version", fallowFull.version],
    ["Repo hygiene issues", repoHygieneIssues(fallowFull, summary)],
    ...fallowDependencySummaryRows(summary),
    ["Health findings", healthItemCount(fallowHealth, "findings")],
    ["Remediation targets", healthItemCount(fallowHealth, "targets")],
  ];
}

export function topFallowFindings(fallowHealth) {
  if (!Array.isArray(fallowHealth?.findings)) {
    return [];
  }

  return fallowHealth.findings
    .filter(isProductionFinding)
    .sort((left, right) => crapScore(right) - crapScore(left))
    .slice(0, 12);
}

export function fallowFindingRows(findings) {
  if (!findings.length) {
    return [["n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "No Fallow health findings were reported."]];
  }

  return findings.map(fallowFindingRow);
}

function fallowFindingRow(finding) {
  return [
    `\`${finding.path}\``,
    `\`${finding.name}\``,
    valueOrNa(finding.line),
    valueOrNa(finding.cyclomatic),
    valueOrNa(finding.cognitive),
    valueOrNa(finding.crap),
    findingRecommendation(finding),
  ];
}

export function fallowTargetRows(fallowHealth) {
  const targets = Array.isArray(fallowHealth?.targets)
    ? fallowHealth.targets.filter((target) => isAppRemediationPath(target.path)).slice(0, 8)
    : [];
  if (!targets.length) {
    return [["n/a", "n/a", "n/a", "No Fallow remediation targets were reported."]];
  }

  return targets.map((target) => [
    `\`${target.path}\``,
    target.priority ?? "n/a",
    target.category ?? "n/a",
    target.recommendation ?? "n/a",
  ]);
}

export function fallowDependencyRows(fallowFull) {
  const testOnly = fallowFull?.check?.test_only_dependencies ?? [];
  if (!testOnly.length) {
    return [["n/a", "n/a", "No dependency hygiene findings."]];
  }

  return testOnly.map((dependency) => [
    `\`${dependency.package_name}\``,
    `${dependency.path}:${dependency.line}`,
    dependency.actions?.[0]?.description ?? "Review dependency placement.",
  ]);
}

function relativePath(root, filePath) {
  return relative(root, filePath).split(sep).join("/");
}

function graphifyUnavailableRows(graphify, paths) {
  if (graphify?.parseError) {
    return [["Status", `Could not parse ${relativePath(paths.root, paths.evidencePath)}: ${graphify.parseError}`]];
  }

  return graphify ? undefined : [["Status", "Missing. Run `npm run audit:graphify`."]];
}

function graphifyMetricRows(summary) {
  return [
    ["Raw node count", summary.node_count],
    ["Post-build node count", summary.post_build_node_count],
    ["Raw edge count", summary.raw_edge_count],
    ["Post-build edge count", summary.post_build_edge_count],
    ["Directed unique endpoint pairs", summary.directed_unique_endpoint_pairs],
    ["Undirected unique endpoint pairs", summary.undirected_unique_endpoint_pairs],
    ["Collapsed directed endpoint edges", summary.directed_same_endpoint_collapsed_edges],
    ["Dangling endpoint edges", summary.dangling_endpoint_edges],
  ];
}

function fallowUnavailableRows(fallowFull, paths) {
  if (fallowFull?.parseError) {
    return [["Status", `Could not parse ${relativePath(paths.root, paths.fullPath)}: ${fallowFull.parseError}`]];
  }

  return fallowFull ? undefined : [["Status", "Missing. Run `npm run audit:fallow`."]];
}

function fallowSummary(fallowFull) {
  const check = fallowFull.check;
  if (!check) {
    return {};
  }

  return check.summary ?? {};
}

function fallowEvidenceFiles(paths) {
  const fullPath = relativePath(paths.root, paths.fullPath);
  const healthPath = relativePath(paths.root, paths.healthPath);
  return `\`${fullPath}\`, \`${healthPath}\``;
}

function fallowDependencySummaryRows(summary) {
  return [
    ["Circular dependencies", summaryMetric(summary, "circular_dependencies")],
    ["Boundary violations", summaryMetric(summary, "boundary_violations")],
    ["Unresolved imports", summaryMetric(summary, "unresolved_imports")],
    ["Unused files", summaryMetric(summary, "unused_files")],
    ["Test-only dependencies", summaryMetric(summary, "test_only_dependencies")],
  ];
}

function summaryMetric(summary, key) {
  return summary[key] ?? 0;
}

function repoHygieneIssues(fallowFull, summary) {
  return fallowFull.check?.total_issues ?? summary.total_issues ?? 0;
}

function healthItemCount(fallowHealth, key) {
  return arrayLengthOrMissing(fallowHealth?.[key]);
}

function arrayLengthOrMissing(value) {
  return Array.isArray(value) ? value.length : "missing";
}

function findingRecommendation(finding) {
  const action = firstAction(finding);
  if (action?.description) {
    return action.description;
  }

  return valueOrNa(finding.severity);
}

function firstAction(finding) {
  return Array.isArray(finding.actions) ? finding.actions[0] : undefined;
}

function valueOrNa(value) {
  return value ?? "n/a";
}

function isProductionFinding(finding) {
  return isAppRemediationPath(finding.path) && !isTestPath(finding.path);
}

function isTestPath(path) {
  return String(path ?? "").endsWith(".test.ts");
}

function crapScore(finding) {
  return finding.crap ?? 0;
}

function isAppRemediationPath(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/");
  return Boolean(normalized) && !isIgnoredRemediationPath(normalized);
}

function isIgnoredRemediationPath(path) {
  return path.includes("public/vendor/") || auditToolingPaths.some((ignored) => path.startsWith(ignored));
}
