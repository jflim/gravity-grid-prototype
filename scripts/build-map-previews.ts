import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { MAPS, type SurfacePoint, type V1Map } from "../server/v1/maps.js";
import type { SeatId } from "../server/v1/rules.js";

const outputPath = resolve("docs/V1_MAP_PREVIEWS.html");
const generatedAt = new Date().toISOString().slice(0, 10);

const seatLabels: Record<SeatId, string> = {
  "red-1": "R1",
  "blue-1": "B1",
  "red-2": "R2",
  "blue-2": "B2",
};

const teamClass: Record<SeatId, "red" | "blue"> = {
  "red-1": "red",
  "blue-1": "blue",
  "red-2": "red",
  "blue-2": "blue",
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scaleX(map: V1Map, x: number) {
  return 30 + (x / map.worldWidth) * 660;
}

function scaleY(map: V1Map, y: number) {
  const topY = 520;
  const bottomY = map.deathPlaneY;
  return 18 + ((y - topY) / (bottomY - topY)) * 214;
}

function surfacePath(map: V1Map) {
  return map.previewSurface.map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(map, point.x).toFixed(1)} ${scaleY(map, point.y).toFixed(1)}`).join(" ");
}

function terrainFillPath(map: V1Map) {
  const surface = surfacePath(map);
  const last = map.previewSurface.at(-1) as SurfacePoint;
  const first = map.previewSurface[0];
  const deathY = scaleY(map, map.deathPlaneY).toFixed(1);
  return `${surface} L ${scaleX(map, last.x).toFixed(1)} ${deathY} L ${scaleX(map, first.x).toFixed(1)} ${deathY} Z`;
}

function spawnMarkers(map: V1Map) {
  return (Object.entries(map.spawns) as Array<[SeatId, V1Map["spawns"][SeatId]]>)
    .map(([seatId, spawn]) => {
      const x = scaleX(map, spawn.x).toFixed(1);
      const y = scaleY(map, spawn.y).toFixed(1);
      const labelY = (scaleY(map, spawn.y) - 18).toFixed(1);
      const arrow = spawn.facing === 1 ? ">" : "<";
      return `
        <g class="spawn spawn--${teamClass[seatId]}">
          <circle cx="${x}" cy="${y}" r="9"></circle>
          <text x="${x}" y="${labelY}" text-anchor="middle">${seatLabels[seatId]}</text>
          <text x="${x}" y="${(scaleY(map, spawn.y) + 4).toFixed(1)}" text-anchor="middle">${arrow}</text>
        </g>`;
    })
    .join("\n");
}

function mapCard(map: V1Map) {
  const deathY = scaleY(map, map.deathPlaneY).toFixed(1);
  return `
    <article class="map-card">
      <div class="map-card__header">
        <div>
          <p>${escapeHtml(map.id)}</p>
          <h2>${escapeHtml(map.name)}</h2>
        </div>
        <dl>
          <div><dt>Wind</dt><dd>${map.windScale.toFixed(2)}x</dd></div>
          <div><dt>Seed Salt</dt><dd>${map.terrainSeedSalt}</dd></div>
        </dl>
      </div>
      <p class="summary">${escapeHtml(map.summary)}</p>
      <svg viewBox="0 0 720 260" role="img" aria-label="${escapeHtml(map.name)} terrain preview">
        <rect class="sky" x="0" y="0" width="720" height="260" rx="8"></rect>
        <path class="canyon" d="${terrainFillPath(map)}"></path>
        <path class="surface" d="${surfacePath(map)}"></path>
        <line class="death-plane" x1="30" y1="${deathY}" x2="690" y2="${deathY}"></line>
        <text class="death-label" x="690" y="${(Number(deathY) - 8).toFixed(1)}" text-anchor="end">death plane</text>
${spawnMarkers(map)}
      </svg>
    </article>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gravity Canyon V1 Map Previews</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f5f7f2;
      --paper: #fffdf8;
      --ink: #20211d;
      --muted: #5f665d;
      --line: #cfd7c9;
      --red: #d64045;
      --blue: #2675d9;
      --terrain: #8d7a55;
      --terrain-line: #352f28;
      --hazard: #b2212b;
      --sky-a: #e8f3f8;
      --sky-b: #f9f3df;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main {
      max-width: 1120px;
      margin: 0 auto;
      padding: 28px 18px 64px;
    }
    header {
      margin-bottom: 20px;
    }
    header p {
      color: var(--muted);
      margin: 0 0 8px;
    }
    h1 {
      font-size: clamp(2rem, 4vw, 3.25rem);
      line-height: 1.05;
      margin: 0 0 12px;
    }
    .note {
      border: 1px solid var(--line);
      border-left: 5px solid var(--blue);
      background: var(--paper);
      border-radius: 8px;
      padding: 12px 14px;
      color: var(--muted);
      margin: 14px 0 22px;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      color: var(--muted);
      font-size: 0.92rem;
      margin-bottom: 18px;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .chip {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-block;
    }
    .chip--red { background: var(--red); }
    .chip--blue { background: var(--blue); }
    .chip--line {
      border-radius: 0;
      width: 24px;
      height: 0;
      border-top: 3px dashed var(--hazard);
      background: transparent;
    }
    .grid {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    }
    .map-card {
      border: 1px solid var(--line);
      background: var(--paper);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 10px 24px rgba(36, 45, 35, 0.08);
    }
    .map-card__header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: start;
      margin-bottom: 8px;
    }
    .map-card__header p {
      color: var(--muted);
      font-size: 0.78rem;
      letter-spacing: 0;
      margin: 0 0 3px;
      text-transform: uppercase;
    }
    h2 {
      line-height: 1.1;
      margin: 0;
      font-size: 1.35rem;
    }
    dl {
      display: flex;
      gap: 10px;
      margin: 0;
      color: var(--muted);
      font-size: 0.82rem;
      text-align: right;
      white-space: nowrap;
    }
    dt { font-weight: 700; }
    dd { margin: 0; }
    .summary {
      color: var(--muted);
      margin: 0 0 12px;
      min-height: 2.9em;
    }
    svg {
      width: 100%;
      display: block;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--sky-a);
    }
    .sky { fill: url(#none); fill: var(--sky-a); }
    .canyon { fill: var(--terrain); opacity: 0.92; }
    .surface {
      fill: none;
      stroke: var(--terrain-line);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .death-plane {
      stroke: var(--hazard);
      stroke-width: 2;
      stroke-dasharray: 7 7;
      opacity: 0.8;
    }
    .death-label {
      fill: var(--hazard);
      font-size: 12px;
      font-weight: 700;
    }
    .spawn circle {
      fill: #fffdf8;
      stroke-width: 4;
    }
    .spawn text {
      fill: var(--ink);
      font-size: 13px;
      font-weight: 800;
    }
    .spawn--red circle { stroke: var(--red); }
    .spawn--blue circle { stroke: var(--blue); }
    a { color: var(--blue); }
    code {
      background: #e8eee2;
      border-radius: 4px;
      padding: 0.12em 0.3em;
    }
  </style>
</head>
<body>
  <main>
    <header>
      <p>Generated from <code>server/v1/maps.ts</code> on ${generatedAt}</p>
      <h1>V1 Map Previews</h1>
      <div class="note">
        These are contract previews for spawn layout and terrain silhouette. Final Phaser terrain can add texture and polish, but it should preserve these readability goals unless the V1 contract changes.
      </div>
      <div class="legend">
        <span><i class="chip chip--red"></i>Red seats</span>
        <span><i class="chip chip--blue"></i>Blue seats</span>
        <span><i class="chip chip--line"></i>Death plane</span>
      </div>
    </header>
    <section class="grid">
${MAPS.map(mapCard).join("\n")}
    </section>
  </main>
</body>
</html>
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, "utf8");
console.log(`Generated docs/V1_MAP_PREVIEWS.html from ${MAPS.length} maps.`);
