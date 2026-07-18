import assert from "node:assert/strict";
import test from "node:test";
import { resolveOnlineServerUrl } from "./onlineServerUrl";

test("explicit Colyseus URL override wins", () => {
  assert.equal(
    resolveOnlineServerUrl(
      {
        protocol: "https:",
        hostname: "play.example.test",
        host: "play.example.test",
        port: "",
      },
      "wss://rooms.example.test",
    ),
    "wss://rooms.example.test",
  );
});

test("vite dev client connects to local Colyseus port", () => {
  assert.equal(
    resolveOnlineServerUrl({
      protocol: "http:",
      hostname: "127.0.0.1",
      host: "127.0.0.1:5173",
      port: "5173",
    }),
    "ws://127.0.0.1:2567",
  );
});

test("public preview client uses same public host for WebSockets", () => {
  assert.equal(
    resolveOnlineServerUrl({
      protocol: "https:",
      hostname: "gravity-canyon.example.test",
      host: "gravity-canyon.example.test",
      port: "",
    }),
    "wss://gravity-canyon.example.test",
  );
});

test("built client served from the Colyseus port keeps that port in the WebSocket URL", () => {
  assert.equal(
    resolveOnlineServerUrl({
      protocol: "http:",
      hostname: "127.0.0.1",
      host: "127.0.0.1:2567",
      port: "2567",
    }),
    "ws://127.0.0.1:2567",
  );
});

test("file preview falls back to local Colyseus port", () => {
  assert.equal(
    resolveOnlineServerUrl({
      protocol: "file:",
      hostname: "",
      host: "",
      port: "",
    }),
    "ws://127.0.0.1:2567",
  );
});
