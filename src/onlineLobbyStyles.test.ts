import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("online lobby uses the Canyon Dusk color kit instead of orange, bright blue, or night-black panels", () => {
  const kit = cssBlock(".online-lobby-panel");
  assert.match(kit, /--gc-ui-bg:\s*#17222a;/);
  assert.match(kit, /--gc-ui-surface:\s*#21313a;/);
  assert.match(kit, /--gc-ui-surface-raised:\s*#2b3c45;/);
  assert.match(kit, /--gc-ui-surface-soft:\s*#354a52;/);
  assert.match(kit, /--gc-ui-text-strong:\s*#d6c4a8;/);
  assert.match(kit, /--gc-ui-text-body:\s*#b9aa92;/);
  assert.match(kit, /--gc-ui-text-muted:\s*#938575;/);
  assert.match(kit, /--gc-ui-accent-mineral:\s*#427579;/);
  assert.match(kit, /--gc-ui-accent-copper:\s*#a66f3f;/);

  assert.doesNotMatch(cssBlock(".online-lobby-blue"), /#0b6f99|16,\s*185,\s*210/);
  assert.doesNotMatch(cssBlock(".online-lobby-console"), /#8a410d|#b9742a|#f59e0b/);
  assert.match(cssBlock(".online-stage"), /#18202a/);
  assert.doesNotMatch(cssBlock(".online-stage"), /rgba\(7,\s*10,\s*18/);
  assert.match(cssBlock(".online-panel"), /background:\s*rgba\(29,\s*36,\s*43,\s*0\.96\);/);
  assert.doesNotMatch(cssBlock(".online-mode-toggle button:disabled[data-selected=\"true\"]"), /#8df5b2/);
  assert.doesNotMatch(cssBlock(".online-lobby-ready [data-ready-toggle]"), /#fef08a|#f97316/);
  assert.doesNotMatch(cssBlock(".online-panel button"), /#96d7ff|#9bc9d6/);
  assert.doesNotMatch(cssBlock(".online-panel button:hover"), /#b6e4ff|#afd8df/);
});

test("online lobby keeps inactive and locked text legible", () => {
  assert.doesNotMatch(cssBlock(".online-slot--inactive"), /opacity\s*:/);
  assert.match(cssBlock(".online-slot--inactive .online-seat__unit img"), /opacity:\s*0\.58;/);
  assert.match(cssBlock(".online-panel button:disabled"), /var\(--online-text-muted/);
});

test("hoverable host controls keep readable text instead of inheriting pale button hover", () => {
  assert.match(cssBlock(".online-panel .online-mode-toggle button:hover"), /background:\s*rgba\(33,\s*49,\s*58,\s*0\.9\);/);
  assert.match(cssBlock(".online-panel .online-mode-toggle button:hover"), /color:\s*var\(--online-text-strong\);/);
  assert.match(cssBlock(".online-panel .online-mode-toggle button:hover span"), /color:\s*var\(--online-text-body\);/);
  assert.match(cssBlock(".online-panel .online-mode-toggle button:disabled:hover"), /background:\s*rgba\(20,\s*31,\s*38,\s*0\.54\);/);
  assert.match(cssBlock(".online-panel .online-mode-toggle button:disabled:hover"), /color:\s*var\(--online-text-body\);/);
  assert.match(cssBlock(".online-panel .online-mode-toggle button:disabled:hover span"), /color:\s*var\(--online-text-body\);/);
  assert.match(
    cssBlock(".online-panel .online-mode-toggle button[data-selected=\"true\"]:hover"),
    /linear-gradient\(#4c7f82,\s*#3a6669\)/,
  );
  assert.match(cssBlock(".online-lobby-ready [data-ready-toggle]:hover"), /linear-gradient\(#4c7f82,\s*#3a6669\)/);
  assert.match(cssBlock(".online-panel .online-map-rail__arrow:hover"), /background:\s*rgba\(33,\s*49,\s*58,\s*0\.9\);/);
  assert.doesNotMatch(cssBlock(".online-panel .online-mode-toggle button:hover"), /#91b8ba|#7fa9ab/);
});

test("host badge uses a readable dark tag instead of light text on yellow", () => {
  const badge = cssBlock(".online-seat__host-badge");
  assert.match(badge, /color:\s*var\(--online-text-strong\);/);
  assert.match(badge, /background:\s*rgba\(20,\s*31,\s*38,\s*0\.9\);/);
  assert.match(badge, /border:\s*1px solid rgba\(214,\s*196,\s*168,\s*0\.38\);/);
  assert.doesNotMatch(badge, /#fff|#ffffff|#fef08a|#facc15|#c3a66a/i);
});

test("ready and host seat indicators use colorable icon chips", () => {
  assert.match(cssBlock(".online-slot--ready"), /box-shadow:\s*inset 0 0 0 2px rgba\(111,\s*146,\s*122,\s*0\.34\);/);
  assert.match(cssBlock(".online-seat__status-chip"), /display:\s*inline-flex;/);
  assert.match(cssBlock(".online-seat__status-chip i"), /border-radius:\s*999px;/);
  assert.match(cssBlock(".online-seat__status-chip--ready i"), /background:\s*#6f927a;/);
  assert.match(cssBlock(".online-seat__status-chip--host i"), /background:\s*#a66f3f;/);
  assert.match(cssBlock(".online-seat__status-chip--ready"), /border-color:\s*rgba\(111,\s*146,\s*122,\s*0\.58\);/);
  assert.match(cssBlock(".online-seat__status-chip--host"), /border-color:\s*rgba\(166,\s*111,\s*63,\s*0\.62\);/);
  assert.doesNotMatch(cssBlock(".online-seat__status-chip--ready"), /#fff|#ffffff|#fef08a|#facc15/i);
});

test("character picker uses readable dense-menu text instead of small white and gray text", () => {
  assert.match(cssBlock(".online-panel .online-character-choice"), /background:\s*var\(--gc-ui-surface-raised\);/);
  assert.match(cssBlock(".online-character-choice__meta strong", "last"), /var\(--online-text-strong/);
  assert.match(cssBlock(".online-character-choice__meta span", "last"), /var\(--online-text-body/);
  assert.match(cssBlock(".online-character-choice__summary"), /font-size:\s*12px;/);
  assert.match(cssBlock(".online-character-choice__summary"), /line-height:\s*1\.42;/);
  assert.doesNotMatch(cssBlock(".online-character-choice__meta strong", "last"), /#ffffff/);
});

test("join playtest entry uses the Canyon Dusk lobby color kit", () => {
  assert.match(cssBlock(".online-lobby-entry"), /background:\s*var\(--gc-ui-surface\);/);
  assert.match(cssBlock(".online-lobby-entry__intro"), /background:\s*rgba\(20,\s*31,\s*38,\s*0\.64\);/);
  assert.match(cssBlock(".online-lobby-entry h2"), /color:\s*var\(--online-text-strong\);/);
  assert.match(cssBlock(".online-lobby-entry p"), /color:\s*var\(--online-text-body\);/);
  assert.match(cssBlock(".online-lobby-entry__note"), /color:\s*var\(--online-text-muted\);/);
  assert.match(cssBlock(".online-lobby-entry button"), /linear-gradient\(#427579,\s*#31585c\)/);
  assert.doesNotMatch(cssBlock(".online-lobby-entry"), /#f97316|#fef08a|#96d7ff|#ffffff/i);
});

test("joined playtest lobby hides the entry form even though the entry uses grid layout", () => {
  assert.match(cssBlock(".online-lobby-entry[hidden]"), /display:\s*none;/);
});

test("lobby unit art faces the center of the team grid", () => {
  assert.match(cssBlock(".online-seat__unit--mirrored img"), /transform:\s*scaleX\(-1\);/);
  assert.doesNotMatch(cssBlock(".online-slot--blue"), /transform:\s*scaleX\(-1\);/);
  assert.match(cssBlock(".online-panel__slots::before"), /left:\s*50%;/);
});

test("character picker can normalize source art to one left-facing direction", () => {
  assert.match(cssBlock(".online-character-choice__unit--mirrored img"), /transform:\s*scaleX\(-1\);/);
});

test("online lobby reserves equal desktop seat rows for selected and open cards", () => {
  assert.match(cssBlock(".online-team-column__slots"), /grid-auto-rows:\s*160px;/);
  assert.match(cssBlock(".online-slot"), /height:\s*160px;/);
  assert.match(cssBlock(".online-slot"), /min-height:\s*160px;/);
  assert.match(cssBlock(".online-seat__body"), /grid-template-rows:\s*minmax\(42px,\s*auto\) minmax\(24px,\s*1fr\) 34px;/);
});

test("map labels sit on dark surfaces and avoid pure white or gray-on-blue text", () => {
  assert.match(cssBlock(".online-map-preview__meta"), /background:\s*rgba\(9,\s*18,\s*26,\s*0\.84\);/);
  assert.match(cssBlock(".online-map-preview__meta strong"), /var\(--gc-ui-text-strong\)/);
  assert.match(cssBlock(".online-map-preview__meta em", "last"), /var\(--gc-ui-text-body\)/);
  assert.match(cssBlock(".online-panel .online-map-card"), /background:\s*var\(--gc-ui-surface\);/);
  assert.match(cssBlock(".online-panel .online-map-card"), /color:\s*var\(--gc-ui-text-body\);/);
  assert.match(cssBlock(".online-panel .online-map-rail__arrow"), /background:\s*rgba\(20,\s*31,\s*38,\s*0\.82\);/);
  assert.match(cssBlock(".online-map-card strong"), /var\(--gc-ui-text-strong\)/);
  assert.match(cssBlock(".online-map-card span:not(.online-map-card__thumb)", "last"), /var\(--gc-ui-text-muted\)/);
  assert.doesNotMatch(cssBlock(".online-map-preview__meta strong"), /#ffffff/);
  assert.doesNotMatch(cssBlock(".online-panel .online-map-card"), /#7fa9ab|#91b8ba/);
  assert.doesNotMatch(cssBlock(".online-map-card span:not(.online-map-card__thumb)", "last"), /#b7c4db/);
});

function cssBlock(selector: string, occurrence: "first" | "last" = "first"): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = Array.from(css.matchAll(new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`, "g")));
  const match = occurrence === "first" ? matches[0] : matches.at(-1);
  assert.ok(match, `Missing CSS block for ${selector}`);
  return match[0];
}
