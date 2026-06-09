import assert from "node:assert/strict";
import test from "node:test";
import { extractCloudflaredUrl, parsePlaytestArgs } from "./playtestLauncher.js";

test("playtest launcher builds and tunnels by default", () => {
  const options = parsePlaytestArgs([]);

  assert.equal(options.build, true);
  assert.equal(options.tunnel, true);
  assert.equal(options.port, 2567);
  assert.equal(options.host, "127.0.0.1");
});

test("playtest launcher supports local server-only mode", () => {
  const options = parsePlaytestArgs(["--local", "--no-build", "--port", "3000"]);

  assert.equal(options.build, false);
  assert.equal(options.tunnel, false);
  assert.equal(options.port, 3000);
});

test("playtest launcher supports explicit no-tunnel alias", () => {
  assert.equal(parsePlaytestArgs(["--no-tunnel"]).tunnel, false);
});

test("playtest launcher extracts the public Cloudflare URL from output", () => {
  const url = extractCloudflaredUrl("Your quick Tunnel has been created! Visit it at https://abc.trycloudflare.com");

  assert.equal(url, "https://abc.trycloudflare.com");
});

test("playtest launcher ignores non-Cloudflare URLs in output", () => {
  assert.equal(extractCloudflaredUrl("Started at http://127.0.0.1:2567"), undefined);
});
