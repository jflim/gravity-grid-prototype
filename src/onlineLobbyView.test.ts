import assert from "node:assert/strict";
import test from "node:test";
import {
  canLocalPlayerEditSlot,
  lobbyStatusText,
  localRoleLabel,
  modeLabel,
  slotLabel,
} from "./onlineLobbyView";

test("localRoleLabel names the local captain role", () => {
  assert.equal(localRoleLabel("red-captain"), "Red captain");
  assert.equal(localRoleLabel("blue-captain"), "Blue captain");
  assert.equal(localRoleLabel("spectator"), "Spectator");
  assert.equal(localRoleLabel("unknown"), "Waiting");
});

test("canLocalPlayerEditSlot follows captain team ownership", () => {
  assert.equal(canLocalPlayerEditSlot("red-captain", "red-1"), true);
  assert.equal(canLocalPlayerEditSlot("red-captain", "blue-1"), false);
  assert.equal(canLocalPlayerEditSlot("blue-captain", "blue-2"), true);
  assert.equal(canLocalPlayerEditSlot("spectator", "red-1"), false);
});

test("modeLabel and slotLabel keep lobby wording short", () => {
  assert.equal(modeLabel("1v1"), "1v1");
  assert.equal(modeLabel("2v2"), "2v2");
  assert.equal(slotLabel("red-1"), "Red 1");
  assert.equal(slotLabel("blue-2"), "Blue 2");
});

test("lobbyStatusText explains the blocked start state", () => {
  assert.equal(
    lobbyStatusText({
      status: "Waiting for blue captain.",
      redCaptainName: "NovaHost",
      blueCaptainName: "",
      redReady: true,
      blueReady: false,
    }),
    "Waiting for blue captain.",
  );

  assert.equal(
    lobbyStatusText({
      status: "",
      redCaptainName: "NovaHost",
      blueCaptainName: "VesperFriend",
      redReady: true,
      blueReady: false,
    }),
    "Waiting for VesperFriend to ready.",
  );
});
