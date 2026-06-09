import assert from "node:assert/strict";
import test from "node:test";
import { resolveServerConfig } from "./serverConfig.js";

test("server stays localhost-only by default", () => {
  const config = resolveServerConfig({});

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 2567);
  assert.equal(config.serveClient, false);
  assert.equal(config.publicPreview, false);
  assert.equal(config.onlinePanel, false);
});

test("public preview mode serves the built client without exposing every network interface", () => {
  const config = resolveServerConfig({ PUBLIC_PREVIEW: "1" });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 2567);
  assert.equal(config.serveClient, true);
  assert.equal(config.publicPreview, true);
  assert.equal(config.onlinePanel, true);
});

test("all-interface hosting requires an explicit host override", () => {
  const config = resolveServerConfig({ PUBLIC_PREVIEW: "1", HOST: "0.0.0.0" });

  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.serveClient, true);
  assert.equal(config.publicPreview, true);
  assert.equal(config.onlinePanel, true);
});

test("serving the built client locally does not expose every network interface", () => {
  const config = resolveServerConfig({ SERVE_CLIENT: "1" });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.serveClient, true);
  assert.equal(config.publicPreview, false);
  assert.equal(config.onlinePanel, false);
});

test("online panel can be explicitly toggled for served client modes", () => {
  assert.equal(resolveServerConfig({ SERVE_CLIENT: "1", ONLINE_PANEL: "1" }).onlinePanel, true);
  assert.equal(resolveServerConfig({ PUBLIC_PREVIEW: "1", ONLINE_PANEL: "0" }).onlinePanel, false);
});

test("explicit host and port overrides are honored", () => {
  const config = resolveServerConfig({ HOST: "192.168.1.50", PORT: "3000" });

  assert.equal(config.host, "192.168.1.50");
  assert.equal(config.port, 3000);
});
