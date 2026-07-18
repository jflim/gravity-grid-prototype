export function cell(value) {
  return String(value ?? "n/a").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function table(headers, rows) {
  return [
    `| ${headers.map(cell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

export function concerns(metric) {
  const labels = Object.entries(metric.markers)
    .filter(([, enabled]) => enabled)
    .map(([label]) => label);
  return labels.length ? labels.join(", ") : "pure/data";
}

export function metricRows(metrics) {
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
