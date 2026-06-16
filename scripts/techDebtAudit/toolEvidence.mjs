import { existsSync, readFileSync } from "node:fs";
import { relative, sep } from "node:path";

const auditToolingPaths = [
  "scripts/build-tech-debt-audit.mjs",
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
  if (!graphify || graphify.parseError) {
    return [["Status", graphify?.parseError ? `Could not parse ${relativePath(paths.root, paths.evidencePath)}: ${graphify.parseError}` : "Missing. Run `npm run audit:graphify`."]];
  }

  const summary = graphify.summary ?? graphify;
  return [
    ["Evidence file", `\`${relativePath(paths.root, paths.evidencePath)}\``],
    ["Graph file", "`graphify-out/graph.json`"],
    ["Graphify source command", "`graphify update . --force --no-cluster`"],
    ["Diagnose command", "`graphify diagnose multigraph --json --graph graphify-out/graph.json`"],
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

export function fallowSummaryRows(fallowFull, fallowHealth, paths) {
  if (!fallowFull || fallowFull.parseError) {
    return [["Status", fallowFull?.parseError ? `Could not parse ${relativePath(paths.root, paths.fullPath)}: ${fallowFull.parseError}` : "Missing. Run `npm run audit:fallow`."]];
  }

  const summary = fallowFull.check?.summary ?? {};
  return [
    ["Evidence files", `\`${relativePath(paths.root, paths.fullPath)}\`, \`${relativePath(paths.root, paths.healthPath)}\``],
    ["Fallow version", fallowFull.version],
    ["Repo hygiene issues", fallowFull.check?.total_issues ?? summary.total_issues ?? 0],
    ["Circular dependencies", summary.circular_dependencies ?? 0],
    ["Boundary violations", summary.boundary_violations ?? 0],
    ["Unresolved imports", summary.unresolved_imports ?? 0],
    ["Unused files", summary.unused_files ?? 0],
    ["Test-only dependencies", summary.test_only_dependencies ?? 0],
    ["Health findings", Array.isArray(fallowHealth?.findings) ? fallowHealth.findings.length : "missing"],
    ["Remediation targets", Array.isArray(fallowHealth?.targets) ? fallowHealth.targets.length : "missing"],
  ];
}

export function topFallowFindings(fallowHealth) {
  if (!Array.isArray(fallowHealth?.findings)) {
    return [];
  }

  return fallowHealth.findings
    .filter((finding) => isAppRemediationPath(finding.path))
    .filter((finding) => !String(finding.path ?? "").endsWith(".test.ts"))
    .sort((left, right) => (right.crap ?? 0) - (left.crap ?? 0))
    .slice(0, 12);
}

export function fallowFindingRows(findings) {
  if (!findings.length) {
    return [["n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "No Fallow health findings were reported."]];
  }

  return findings.map((finding) => [
    `\`${finding.path}\``,
    `\`${finding.name}\``,
    finding.line ?? "n/a",
    finding.cyclomatic ?? "n/a",
    finding.cognitive ?? "n/a",
    finding.crap ?? "n/a",
    finding.actions?.[0]?.description ?? finding.severity ?? "n/a",
  ]);
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

function isAppRemediationPath(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/");
  return normalized && !normalized.includes("public/vendor/") && !auditToolingPaths.some((ignored) => normalized.startsWith(ignored));
}
