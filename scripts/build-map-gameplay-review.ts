import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { GAMEPLAY_REVIEWS, type DestructibleFocus, type MapGameplayReview, type MovementRoute, type ZoneBand } from "../server/v1/mapGameplayReview.js";
import { MAPS, type V1Map } from "../server/v1/maps.js";

const outputPath = resolve("docs/V1_MAP_GAMEPLAY_REVIEW.html");
const generatedAt = new Date().toISOString().slice(0, 10);
const previewTopY = 500;

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
  return 18 + ((y - previewTopY) / (map.deathPlaneY - previewTopY)) * 214;
}

function surfacePath(map: V1Map, segment: V1Map["previewSegments"][number]) {
  return segment
    .map((point, index) => `${index === 0 ? "M" : "L"} ${scaleX(map, point.x).toFixed(1)} ${scaleY(map, point.y).toFixed(1)}`)
    .join(" ");
}

function terrainFillPath(map: V1Map, segment: V1Map["previewSegments"][number]) {
  const first = segment[0];
  const last = segment.at(-1);
  const deathY = scaleY(map, map.deathPlaneY).toFixed(1);
  return `${surfacePath(map, segment)} L ${scaleX(map, last.x).toFixed(1)} ${deathY} L ${scaleX(map, first.x).toFixed(1)} ${deathY} Z`;
}

function terrainPaths(map: V1Map) {
  return map.previewSegments
    .map(
      (segment) => `
        <path class="terrain-fill" d="${terrainFillPath(map, segment)}"></path>
        <path class="terrain-line" d="${surfacePath(map, segment)}"></path>`,
    )
    .join("\n");
}

function safeSpawnZones(map: V1Map, review: MapGameplayReview) {
  return review.safeSpawnSeatIds
    .map((seatId) => {
      const spawn = map.spawns[seatId];
      const x = scaleX(map, spawn.x);
      const y = scaleY(map, spawn.y);
      return `
        <g class="safe-zone">
          <rect x="${(x - 34).toFixed(1)}" y="${(y - 28).toFixed(1)}" width="68" height="40" rx="7"></rect>
          <text x="${x.toFixed(1)}" y="${(y - 36).toFixed(1)}" text-anchor="middle">${seatId}</text>
        </g>`;
    })
    .join("\n");
}

function dangerZones(map: V1Map, review: MapGameplayReview) {
  return review.dangerZones
    .map((zone: ZoneBand) => {
      const x1 = scaleX(map, zone.x1);
      const x2 = scaleX(map, zone.x2);
      const y = scaleY(map, map.deathPlaneY) - 34;
      return `
        <g class="danger-zone">
          <rect x="${x1.toFixed(1)}" y="${y.toFixed(1)}" width="${(x2 - x1).toFixed(1)}" height="28" rx="6"></rect>
          <text x="${((x1 + x2) / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${escapeHtml(zone.label)}</text>
        </g>`;
    })
    .join("\n");
}

function movementRoutes(map: V1Map, review: MapGameplayReview) {
  return review.movementRoutes
    .map((route: MovementRoute) => {
      const spawn = map.spawns[route.from];
      const x1 = scaleX(map, spawn.x);
      const y1 = scaleY(map, spawn.y) + 10;
      const x2 = scaleX(map, route.toX);
      const y2 = y1 + 12;
      return `
        <g class="movement-route">
          <path marker-end="url(#move-arrow)" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${((x1 + x2) / 2).toFixed(1)} ${(y1 + 28).toFixed(1)} ${((x1 + x2) / 2).toFixed(1)} ${(y2 + 28).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"></path>
          <text x="${((x1 + x2) / 2).toFixed(1)}" y="${(Math.max(y1, y2) + 42).toFixed(1)}" text-anchor="middle">${escapeHtml(route.label)}</text>
        </g>`;
    })
    .join("\n");
}

function destructibleFocus(map: V1Map, review: MapGameplayReview) {
  return review.destructibleFocus
    .map((focus: DestructibleFocus) => {
      const x = scaleX(map, focus.x);
      const y = scaleY(map, focus.y);
      const radius = Math.max(12, (focus.radius / map.worldWidth) * 660);
      return `
        <g class="destructible-focus">
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}"></circle>
          <text x="${x.toFixed(1)}" y="${(y - radius - 7).toFixed(1)}" text-anchor="middle">${escapeHtml(focus.label)}</text>
        </g>`;
    })
    .join("\n");
}

function openingReads(map: V1Map, review: MapGameplayReview) {
  return review.openingReads
    .map((read) => {
      const from = map.spawns[read.from];
      const to = map.spawns[read.to];
      const x1 = scaleX(map, from.x);
      const y1 = scaleY(map, from.y) - 18;
      const x2 = scaleX(map, to.x);
      const y2 = scaleY(map, to.y) - 18;
      const controlY = Math.min(y1, y2) - 34;
      return `
        <g class="opening-read">
          <path marker-end="url(#shot-arrow)" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${((x1 + x2) / 2).toFixed(1)} ${controlY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"></path>
          <text x="${((x1 + x2) / 2).toFixed(1)}" y="${(controlY - 8).toFixed(1)}" text-anchor="middle">${escapeHtml(read.label)}</text>
        </g>`;
    })
    .join("\n");
}

function bulletList(items: readonly string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function noteList<T extends { label: string; note: string }>(items: readonly T[]) {
  return `<ul>${items.map((item) => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.note)}</li>`).join("")}</ul>`;
}

function reviewCard(review: MapGameplayReview) {
  const map = MAPS.find((candidate) => candidate.id === review.mapId);
  if (!map) {
    throw new Error(`No map found for ${review.mapId}`);
  }

  return `
    <article class="review-card">
      <header>
        <p>${escapeHtml(map.id)}</p>
        <h2>${escapeHtml(review.title)}</h2>
        <strong>${escapeHtml(review.promise)}</strong>
      </header>
      <svg viewBox="0 0 720 286" role="img" aria-label="${escapeHtml(map.name)} gameplay review diagram">
        <defs>
          <marker id="move-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
          <marker id="shot-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z"></path>
          </marker>
        </defs>
        <rect class="sky" x="0" y="0" width="720" height="286" rx="8"></rect>
${terrainPaths(map)}
${dangerZones(map, review)}
${destructibleFocus(map, review)}
${movementRoutes(map, review)}
${openingReads(map, review)}
${safeSpawnZones(map, review)}
      </svg>
      <section class="notes-grid">
        <div><h3>Movement</h3>${noteList(review.movementRoutes)}</div>
        <div><h3>Danger</h3>${noteList(review.dangerZones)}</div>
        <div><h3>Destructible Focus</h3>${noteList(review.destructibleFocus)}</div>
        <div><h3>Opening Reads</h3>${noteList(review.openingReads)}</div>
        <div><h3>Why It Could Be Fun</h3>${bulletList(review.funFactors)}</div>
        <div><h3>Risks To Watch</h3>${bulletList(review.riskNotes)}</div>
      </section>
    </article>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gravity Canyon V1 Map Gameplay Review</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f5ef;
      --paper: #fffdf8;
      --ink: #20211d;
      --muted: #5f665d;
      --line: #cfd7c9;
      --terrain: #867450;
      --terrain-line: #302a21;
      --safe: #287f5b;
      --danger: #c33d32;
      --focus: #7a4fb3;
      --move: #246bbd;
      --shot: #b86622;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main { max-width: 1180px; margin: 0 auto; padding: 28px 18px 64px; }
    body > main > header { margin-bottom: 20px; }
    h1 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.08; margin: 0 0 10px; }
    h2, h3 { line-height: 1.15; }
    h2 { margin: 0 0 8px; }
    h3 { margin: 0 0 8px; font-size: 1rem; }
    p { color: var(--muted); }
    .review-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--paper);
      padding: 18px;
      margin-bottom: 22px;
      box-shadow: 0 10px 24px rgba(36, 45, 35, 0.08);
    }
    .review-card > header p {
      margin: 0 0 3px;
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
    }
    .review-card > header strong {
      display: block;
      color: #405b41;
      margin-bottom: 14px;
    }
    svg {
      display: block;
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #e8f3f8;
      margin-bottom: 16px;
    }
    .sky { fill: #e8f3f8; }
    .terrain-fill { fill: var(--terrain); opacity: 0.92; }
    .terrain-line { fill: none; stroke: var(--terrain-line); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
    .safe-zone rect { fill: rgba(40, 127, 91, 0.16); stroke: var(--safe); stroke-width: 2; }
    .safe-zone text { fill: var(--safe); font-size: 12px; font-weight: 900; }
    .danger-zone rect { fill: rgba(195, 61, 50, 0.16); stroke: var(--danger); stroke-width: 2; stroke-dasharray: 6 4; }
    .danger-zone text { fill: var(--danger); font-size: 12px; font-weight: 900; }
    .destructible-focus circle { fill: rgba(122, 79, 179, 0.12); stroke: var(--focus); stroke-width: 2; }
    .destructible-focus text { fill: var(--focus); font-size: 11px; font-weight: 900; }
    .movement-route path { fill: none; stroke: var(--move); stroke-width: 3; stroke-dasharray: 7 5; }
    .movement-route text { fill: var(--move); font-size: 11px; font-weight: 900; }
    .opening-read path { fill: none; stroke: var(--shot); stroke-width: 3; }
    .opening-read text { fill: var(--shot); font-size: 11px; font-weight: 900; paint-order: stroke; stroke: var(--paper); stroke-width: 4px; }
    marker#move-arrow path { fill: var(--move); }
    marker#shot-arrow path { fill: var(--shot); }
    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }
    .notes-grid > div {
      border-top: 1px solid var(--line);
      padding-top: 12px;
    }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 7px; }
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
      <p>Generated from <code>server/v1/mapGameplayReview.ts</code> on ${generatedAt}</p>
      <h1>V1 Map Gameplay Review</h1>
      <p>This page reviews gameplay intent for the two novel V1 map concepts. It is about decisions, risk, and readability, not final art.</p>
    </header>
${GAMEPLAY_REVIEWS.map(reviewCard).join("\n")}
  </main>
</body>
</html>
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, "utf8");
console.log(`Generated docs/V1_MAP_GAMEPLAY_REVIEW.html from ${GAMEPLAY_REVIEWS.length} reviews.`);
