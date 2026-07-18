import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultUrl = "http://127.0.0.1:5173";
const defaultViewport = "1600x900";

export function parseBrowserVisualArgs(args) {
  let options = defaultOptions();

  for (let index = 0; index < args.length; index += 1) {
    const parsed = parseBrowserVisualToken(options, args, index);
    options = parsed.options;
    index = parsed.index;
  }

  return withDefaultScreenshotPath(options);
}

export function screenshotPathFor(url, viewport) {
  const safeUrl = url
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return join("work", "browser-visual", `${safeUrl || "page"}-${viewport}.png`);
}

export function findBrowserExecutable(options = {}) {
  const exists = options.exists ?? existsSync;
  const candidates = options.candidates ?? defaultBrowserCandidates();
  return candidates.find((candidate) => exists(candidate));
}

export function buildBrowserArgs(options) {
  return [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--in-process-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    options.profileDir ? `--user-data-dir=${options.profileDir}` : undefined,
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    `--window-size=${options.width},${options.height}`,
    `--screenshot=${options.out}`,
    options.url,
  ].filter(Boolean);
}

export function resolveScreenshotOutput(options, root = process.cwd()) {
  return {
    ...options,
    out: resolve(root, options.out),
  };
}

export function runBrowserVisualSmoke(rawArgs = process.argv.slice(2)) {
  const options = parseBrowserVisualArgs(rawArgs);
  const browserOptions = withBrowserProfile(resolveScreenshotOutput(options));
  const browserPath = browserExecutableFor(options);

  mkdirSync(dirname(browserOptions.out), { recursive: true });
  try {
    assertBrowserResult(browserPath, runBrowserProcess(browserPath, browserOptions));
    assertScreenshotWritten(browserOptions.out, options.out);
  } finally {
    cleanupBrowserProfile(browserOptions.profileDir);
  }

  console.log(`Browser visual smoke screenshot: ${options.out}`);
}

function withBrowserProfile(options) {
  return {
    ...options,
    profileDir: mkdtempSync(join(tmpdir(), "gravity-canyon-browser-visual-")),
  };
}

function cleanupBrowserProfile(profileDir) {
  if (profileDir) {
    rmSync(profileDir, { recursive: true, force: true });
  }
}

function defaultOptions() {
  return {
    browser: undefined,
    url: defaultUrl,
    width: 1600,
    height: 900,
    out: undefined,
  };
}

function parseBrowserVisualToken(options, args, index) {
  const arg = args[index];
  const parser = optionParsers.get(arg);
  if (parser) {
    return parser(options, args, index);
  }

  return {
    index,
    options: isUrlArgument(arg) ? { ...options, url: arg } : options,
  };
}

const optionParsers = new Map([
  ["--browser", (options, args, index) => valueOption(options, args, index, "browser")],
  ["--out", (options, args, index) => valueOption(options, args, index, "out")],
  ["--viewport", viewportOption],
]);

function valueOption(options, args, index, key) {
  return {
    index: index + 1,
    options: { ...options, [key]: args[index + 1] },
  };
}

function viewportOption(options, args, index) {
  return {
    index: index + 1,
    options: { ...options, ...parseViewport(args[index + 1]) },
  };
}

function isUrlArgument(arg) {
  return !String(arg).startsWith("--");
}

function withDefaultScreenshotPath(options) {
  return {
    ...options,
    out: options.out ?? screenshotPathFor(options.url, `${options.width}x${options.height}`),
  };
}

function browserExecutableFor(options) {
  const browserPath = options.browser ?? findBrowserExecutable();
  if (!browserPath) {
    throw new Error("No Chrome or Edge executable found. Install Chrome/Edge or pass --browser <path>.");
  }

  return browserPath;
}

function runBrowserProcess(browserPath, browserOptions) {
  return spawnSync(browserPath, buildBrowserArgs(browserOptions), {
    encoding: "utf8",
    stdio: "inherit",
  });
}

function assertBrowserResult(browserPath, result) {
  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${browserPath} exited with code ${result.status ?? "unknown"}.`);
  }
}

function assertScreenshotWritten(resolvedOut, displayOut) {
  if (!existsSync(resolvedOut) || statSync(resolvedOut).size < 1024) {
    throw new Error(`Screenshot was not written or is unexpectedly small: ${displayOut}`);
  }
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/.exec(value ?? "");
  if (!match) {
    throw new Error(`Expected --viewport WIDTHxHEIGHT, got ${value ?? "missing"}.`);
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function defaultBrowserCandidates() {
  return process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runBrowserVisualSmoke();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
