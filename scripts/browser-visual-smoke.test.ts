import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBrowserArgs,
  findBrowserExecutable,
  parseBrowserVisualArgs,
  resolveScreenshotOutput,
  screenshotPathFor,
} from "./browser-visual-smoke.mjs";

test("browser visual smoke finds the first installed browser candidate", () => {
  const found = findBrowserExecutable({
    exists: (path) => path.endsWith("chrome.exe"),
    candidates: ["C:\\Missing\\msedge.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"],
  });

  assert.equal(found, "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
});

test("browser visual smoke defaults to the local client URL and standard game viewport", () => {
  const options = parseBrowserVisualArgs([]);

  assert.equal(options.url, "http://127.0.0.1:5173");
  assert.equal(options.width, 1600);
  assert.equal(options.height, 900);
  assert.equal(options.out, screenshotPathFor("http://127.0.0.1:5173", "1600x900"));
});

test("browser visual smoke builds a deterministic headless screenshot command", () => {
  const args = buildBrowserArgs({
    url: "http://127.0.0.1:2567/?online=1",
    out: "work/browser-visual/playtest.png",
    profileDir: "work/browser-visual/profile",
    width: 1366,
    height: 768,
  });

  assert.deepEqual(args, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--in-process-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--user-data-dir=work/browser-visual/profile",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    "--window-size=1366,768",
    "--screenshot=work/browser-visual/playtest.png",
    "http://127.0.0.1:2567/?online=1",
  ]);
});

test("browser visual smoke accepts explicit url, viewport, and output path", () => {
  const options = parseBrowserVisualArgs([
    "http://127.0.0.1:2567",
    "--viewport",
    "1366x768",
    "--out",
    "work/browser-visual/custom.png",
  ]);

  assert.equal(options.url, "http://127.0.0.1:2567");
  assert.equal(options.width, 1366);
  assert.equal(options.height, 768);
  assert.equal(options.out, "work/browser-visual/custom.png");
});

test("browser visual smoke resolves screenshot output before launching Chrome", () => {
  const options = resolveScreenshotOutput(
    {
      url: "http://127.0.0.1:5173",
      out: "work/browser-visual/local.png",
      width: 1600,
      height: 900,
    },
    "C:\\Users\\jflim\\Code\\gravity-canyon",
  );

  assert.equal(options.out, "C:\\Users\\jflim\\Code\\gravity-canyon\\work\\browser-visual\\local.png");
});
