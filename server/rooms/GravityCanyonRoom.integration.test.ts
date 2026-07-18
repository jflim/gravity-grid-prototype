import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { Client, type Room as ClientRoom } from "@colyseus/sdk";
import { Server } from "colyseus";
import { GravityCanyonRoom } from "./GravityCanyonRoom.js";
import type { GravityCanyonState } from "../schema/GravityCanyonState.js";

type GravityCanyonClientRoom = ClientRoom<unknown, GravityCanyonState>;
type TwoClientRooms = {
  firstRoom: GravityCanyonClientRoom;
  secondRoom: GravityCanyonClientRoom;
};

test("room requests 60hz state patches for responsive online movement", () => {
  const roomSource = readFileSync("server/rooms/GravityCanyonRoom.ts", "utf8");

  assert.match(roomSource, /const SERVER_STATE_PATCH_INTERVAL_MS = 1000 \/ 60/);
  assert.match(roomSource, /this\.setPatchRate\(SERVER_STATE_PATCH_INTERVAL_MS\)/);
});

test("auto-room playtest flow puts two clients in one combat preview", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    assert.equal(firstRoom.roomId, secondRoom.roomId);
    assert.equal(firstRoom.state.roomCode, "auto-room");
    assert.equal(firstRoom.state.hostSessionId, firstRoom.sessionId);
    assert.equal(firstRoom.state.players.get(firstRoom.sessionId)?.role, "host");
    assert.equal(firstRoom.state.players.get(secondRoom.sessionId)?.role, "player");

    await startDuelPreview(firstRoom, secondRoom);

    assert.equal(firstRoom.state.mode, "1v1");
    assert.equal(firstRoom.state.phase, "combat-preview");
    assert.deepEqual(
      Array.from(firstRoom.state.vehicles).map((vehicle) => ({
        vehicleId: vehicle.vehicleId,
        ownerSessionId: vehicle.ownerSessionId,
        team: vehicle.team,
        className: vehicle.className,
      })),
      [
        {
          vehicleId: "red-1",
          ownerSessionId: firstRoom.sessionId,
          team: "red",
          className: "Flashkick Skip-Rig",
        },
        {
          vehicleId: "blue-1",
          ownerSessionId: secondRoom.sessionId,
          team: "blue",
          className: "Sunspike Embercart",
        },
      ],
    );
  });
});

test("joining players are automatically seated on balanced teams", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    assert.equal(slotOwner(firstRoom, "red-1"), firstRoom.sessionId);
    assert.equal(slotOwner(firstRoom, "blue-1"), secondRoom.sessionId);
    assert.equal(slotOwner(secondRoom, "red-1"), firstRoom.sessionId);
    assert.equal(slotOwner(secondRoom, "blue-1"), secondRoom.sessionId);
  });
});

test("room publishes server-owned match setup from host settings", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    firstRoom.send("setRoomSettings", { mode: "1v1", matchLength: "best-of-3", mapPick: "bridgeworks" });
    await waitFor(() => firstRoom.state.mode === "1v1", "host mode setting");
    await waitFor(() => firstRoom.state.matchLength === "best-of-3", "host match length setting");
    await waitFor(() => firstRoom.state.mapPick === "bridgeworks", "host map setting");

    await startDuelPreview(firstRoom, secondRoom);

    assert.equal(firstRoom.state.selectedMapId, "bridgeworks");
    assert.equal(firstRoom.state.selectedMapName, "Bridgeworks");
    assert.equal(firstRoom.state.targetScore, 2);
    assert.deepEqual(Array.from(firstRoom.state.turnSequence), ["red-1", "blue-1"]);
    const redVehicle = firstRoom.state.vehicles[0];
    const blueVehicle = firstRoom.state.vehicles[1];
    assert.ok(redVehicle, "red vehicle exists");
    assert.ok(blueVehicle, "blue vehicle exists");
    assert.equal(redVehicle.seatId, "red-1");
    assert.equal(redVehicle.characterId, "kaelii");
    assert.equal(redVehicle.x, 370);
    assert.equal(redVehicle.facing, 1);
    assert.equal(blueVehicle.seatId, "blue-1");
    assert.equal(blueVehicle.characterId, "perlah");
    assert.equal(blueVehicle.x, 2030);
    assert.equal(blueVehicle.facing, -1);
  });
});

test("unit selections synchronize to every connected lobby client", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    firstRoom.send("claimSeat", { slotId: "red-1" });
    await waitFor(
      () =>
        slotOwner(firstRoom, "red-1") === firstRoom.sessionId &&
        slotOwner(secondRoom, "red-1") === firstRoom.sessionId,
      "host red seat claim sync",
    );

    firstRoom.send("selectCharacter", { slotId: "red-1", characterId: "vesper" });
    await waitFor(
      () => unitSelectionSyncedToRooms(firstRoom, secondRoom, "red-1", "vesper"),
      "host unit selection sync",
    );
  });
});

test("server rejects forged lobby actions that are disabled in the UI", async () => {
  await withTwoClientRooms(assertForgedLobbyActionsRejected);
});

test("server rejects forged gameplay actions that are disabled in the UI", async () => {
  await withTwoClientRooms(assertForgedGameplayActionsRejected);
});

test("server accepts turn intents only from the active vehicle owner", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    await startDuelPreview(firstRoom, secondRoom);

    firstRoom.send("submitTurnIntent", { intentId: "aim-red", action: "aim" });
    await settleMessages();
    assert.equal(firstRoom.state.lastAcceptedTurnIntentId, "aim-red");

    const acceptedVersion = firstRoom.state.turnAuthorityVersion;
    secondRoom.send("submitTurnIntent", { intentId: "aim-blue", action: "aim" });
    await settleMessages();

    assert.equal(firstRoom.state.lastAcceptedTurnIntentId, "aim-red");
    assert.equal(firstRoom.state.lastAcceptedTurnIntentType, "aim");
    assert.equal(firstRoom.state.lastAcceptedTurnIntentVehicleId, "red-1");
    assert.equal(firstRoom.state.lastAcceptedTurnIntentSessionId, firstRoom.sessionId);
    assert.equal(firstRoom.state.turnAuthorityVersion, acceptedVersion);
  });
});

test("server applies active-owner aim, move, and fire intents through submitTurnIntent", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    await startDuelPreview(firstRoom, secondRoom);
    const startX = vehicleX(firstRoom, "red-1");

    firstRoom.send("submitTurnIntent", {
      intentId: "aim-red",
      action: "aim",
      angle: 64,
      facing: 1,
    });
    await waitFor(
      () => vehicleAngle(firstRoom, "red-1") === 64 && vehicleAngle(secondRoom, "red-1") === 64,
      "server-owned aim intent",
    );
    assert.equal(firstRoom.state.lastAcceptedTurnIntentId, "aim-red");

    firstRoom.send("submitTurnIntent", {
      intentId: "move-red",
      action: "move",
      direction: 1,
      deltaSeconds: 0.5,
    });
    await waitFor(() => vehicleX(firstRoom, "red-1") > startX, "server-owned move intent");
    const serverX = vehicleX(firstRoom, "red-1");
    assert.equal(firstRoom.state.lastAcceptedTurnIntentId, "move-red");

    firstRoom.send("submitTurnIntent", {
      intentId: "fire-red",
      action: "fire",
      angle: 42,
      power: 74,
      facing: 1,
      clientPredictedX: 999,
    });
    await waitFor(() => firstRoom.state.lastShotId.includes("red-1"), "server-owned fire intent");

    assert.equal(firstRoom.state.lastShotOriginX, serverX);
    assert.equal(firstRoom.state.lastShotPower, 74);
    assert.ok(firstRoom.state.lastShotImpactX > 0, "server should record the authoritative impact x");
    assert.ok(firstRoom.state.lastShotImpactY > 0, "server should record the authoritative impact y");
    assert.equal(firstRoom.state.activeVehicleId, "blue-1");
  });
});

test("server publishes the turn countdown without waiting for player input", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    await startDuelPreview(firstRoom, secondRoom);

    assert.equal(firstRoom.state.turnSecondsRemaining, 20);
    assert.equal(secondRoom.state.turnSecondsRemaining, 20);

    await waitFor(
      () => firstRoom.state.turnSecondsRemaining < 20 && secondRoom.state.turnSecondsRemaining < 20,
      "server turn countdown tick",
    );

    assert.equal(firstRoom.state.turnSecondsRemaining, secondRoom.state.turnSecondsRemaining);
  });
});

test("server publishes server time on the combat heartbeat", async () => {
  await withTwoClientRooms(async ({ firstRoom, secondRoom }) => {
    await startDuelPreview(firstRoom, secondRoom);
    const initialServerTimeMs = firstRoom.state.serverTimeMs;

    await waitFor(
      () =>
        firstRoom.state.serverTimeMs > initialServerTimeMs &&
        secondRoom.state.serverTimeMs === firstRoom.state.serverTimeMs,
      "server time heartbeat",
    );
  });
});

async function assertForgedLobbyActionsRejected({ firstRoom, secondRoom }: TwoClientRooms) {
  await assertNonHostModeChangeRejected(firstRoom, secondRoom);
  await assertHostOwnedSettingsChangeReadiesPlayers(firstRoom, secondRoom);
  await claimHostRedSeat(firstRoom);
  await assertDisabledLobbySeatMessagesIgnored(firstRoom, secondRoom);
}

async function assertNonHostModeChangeRejected(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
) {
  secondRoom.send("setMode", { mode: "1v1" });
  await settleMessages();
  assert.equal(firstRoom.state.mode, "2v2");

  firstRoom.send("setMode", { mode: "1v1" });
  await waitFor(() => firstRoom.state.mode === "1v1", "host mode change");
}

async function assertHostOwnedSettingsChangeReadiesPlayers(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
) {
  secondRoom.send("setRoomSettings", { matchLength: "best-of-3", mapPick: "bridgeworks" });
  await settleMessages();
  assert.equal(firstRoom.state.matchLength, "best-of-1");
  assert.equal(firstRoom.state.mapPick, "random");

  firstRoom.send("claimSeat", { slotId: "red-1" });
  await waitFor(
    () => firstRoom.state.slots.get("red-1")?.ownerSessionId === firstRoom.sessionId,
    "host red seat claim before settings",
  );
  firstRoom.send("selectCharacter", { slotId: "red-1", characterId: "nova" });
  await waitFor(
    () => firstRoom.state.slots.get("red-1")?.characterSelected === true,
    "host red unit select before settings",
  );
  firstRoom.send("setReady", { ready: true });
  await waitFor(
    () => firstRoom.state.players.get(firstRoom.sessionId)?.ready === true,
    "host ready before settings change",
  );

  firstRoom.send("setRoomSettings", { matchLength: "best-of-3", mapPick: "bridgeworks" });
  await waitFor(
    () =>
      firstRoom.state.matchLength === "best-of-3" &&
      firstRoom.state.mapPick === "bridgeworks" &&
      firstRoom.state.players.get(firstRoom.sessionId)?.ready === false,
    "host room settings change",
  );
}

async function claimHostRedSeat(firstRoom: GravityCanyonClientRoom) {
  firstRoom.send("claimSeat", { slotId: "red-1" });
  await waitFor(
    () => firstRoom.state.slots.get("red-1")?.ownerSessionId === firstRoom.sessionId,
    "host red seat claim",
  );
}

async function assertDisabledLobbySeatMessagesIgnored(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
) {
  firstRoom.send("selectCharacter", { slotId: "red-1", characterId: "nova" });
  await waitFor(
    () => firstRoom.state.slots.get("red-1")?.characterSelected === true,
    "host unit select after claiming a seat",
  );
  firstRoom.send("setReady", { ready: true });
  await waitFor(
    () => firstRoom.state.players.get(firstRoom.sessionId)?.ready === true,
    "host ready after claiming a seat",
  );

  firstRoom.send("claimSeat", { slotId: "red-1" });
  secondRoom.send("claimSeat", { slotId: "red-1" });
  secondRoom.send("claimSeat", { slotId: "red-2" });
  secondRoom.send("selectCharacter", { slotId: "red-1", characterId: "perlah" });
  secondRoom.send("setReady", { ready: true });
  await settleMessages();

  assert.equal(slotOwner(firstRoom, "red-1"), firstRoom.sessionId);
  assert.equal(selectedCharacter(firstRoom, "red-1"), "nova");
  assert.equal(slotOwner(firstRoom, "red-2"), "");
  assert.equal(playerReady(firstRoom, firstRoom.sessionId), true);
  assert.equal(playerReady(firstRoom, secondRoom.sessionId), false);
}

async function assertForgedGameplayActionsRejected({ firstRoom, secondRoom }: TwoClientRooms) {
  await startDuelPreview(firstRoom, secondRoom);
  await assertGameplayLobbyMessagesIgnored(firstRoom, secondRoom);
  await assertNonHostNextRoundRejected(firstRoom, secondRoom);
}

async function assertGameplayLobbyMessagesIgnored(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
) {
  firstRoom.send("setReady", { ready: false });
  firstRoom.send("setMode", { mode: "2v2" });
  firstRoom.send("setRoomSettings", { matchLength: "best-of-3", mapPick: "bridgeworks" });
  secondRoom.send("claimSeat", { slotId: "red-1" });
  secondRoom.send("selectCharacter", { slotId: "blue-1", characterId: "nova" });
  secondRoom.send("previewFire");
  await settleMessages();

  assert.equal(firstRoom.state.phase, "combat-preview");
  assert.equal(firstRoom.state.mode, "1v1");
  assert.equal(firstRoom.state.matchLength, "best-of-1");
  assert.equal(firstRoom.state.mapPick, "random");
  assert.equal(playerReady(firstRoom, firstRoom.sessionId), true);
  assert.equal(slotOwner(firstRoom, "red-1"), firstRoom.sessionId);
  assert.equal(selectedCharacter(firstRoom, "blue-1"), "perlah");
  assert.equal(vehicleHp(firstRoom, "blue-1"), 100);
}

async function assertNonHostNextRoundRejected(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
) {
  const roundNumber = firstRoom.state.roundNumber;

  secondRoom.send("startNextRound");
  await settleMessages();
  assert.equal(firstRoom.state.phase, "combat-preview");
  assert.equal(firstRoom.state.roundNumber, roundNumber);
}

async function withTwoClientRooms(run: (rooms: TwoClientRooms) => Promise<void>) {
  const gameServer = new Server({ greet: false });
  let firstRoom: GravityCanyonClientRoom | undefined;
  let secondRoom: GravityCanyonClientRoom | undefined;

  try {
    gameServer.define("gravity_canyon", GravityCanyonRoom);
    await gameServer.listen(0, "127.0.0.1");
    const address = gameServer.transport.server?.address();
    if (!address || typeof address === "string") {
      assert.fail("Expected Colyseus test server to listen on a TCP port.");
    }

    const endpoint = `ws://127.0.0.1:${address.port}`;
    const firstClient = new Client(endpoint);
    const secondClient = new Client(endpoint);
    const firstJoinedRoom = await firstClient.joinOrCreate<GravityCanyonState>("gravity_canyon", {
      displayName: "RedTest",
    });
    const secondJoinedRoom = await secondClient.joinOrCreate<GravityCanyonState>("gravity_canyon", {
      displayName: "BlueTest",
    });
    firstRoom = firstJoinedRoom;
    secondRoom = secondJoinedRoom;

    await waitFor(
      () =>
        Boolean(firstJoinedRoom.state.hostSessionId) &&
        Boolean(firstJoinedRoom.state.players.get(secondJoinedRoom.sessionId)),
      "host and player assignment",
    );

    await run({ firstRoom: firstJoinedRoom, secondRoom: secondJoinedRoom });
  } finally {
    await secondRoom?.leave();
    await firstRoom?.leave();
    await gameServer.gracefullyShutdown(false);
  }
}

async function startDuelPreview(firstRoom: GravityCanyonClientRoom, secondRoom: GravityCanyonClientRoom) {
  firstRoom.send("setMode", { mode: "1v1" });
  firstRoom.send("claimSeat", { slotId: "red-1" });
  secondRoom.send("claimSeat", { slotId: "blue-1" });
  await waitFor(
    () =>
      firstRoom.state.slots.get("red-1")?.ownerSessionId === firstRoom.sessionId &&
      firstRoom.state.slots.get("blue-1")?.ownerSessionId === secondRoom.sessionId,
    "duel seat claims",
  );

  firstRoom.send("selectCharacter", { slotId: "red-1", characterId: "kaelii" });
  secondRoom.send("selectCharacter", { slotId: "blue-1", characterId: "perlah" });
  firstRoom.send("setReady", { ready: true });
  secondRoom.send("setReady", { ready: true });
  await waitFor(() => firstRoom.state.phase === "combat-preview", "duel combat preview");
}

async function waitFor(predicate: () => boolean, label: string, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  assert.fail(`Timed out waiting for ${label}`);
}

async function settleMessages() {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function slotOwner(room: GravityCanyonClientRoom, slotId: string): string {
  return room.state.slots.get(slotId)?.ownerSessionId ?? "";
}

function selectedCharacter(room: GravityCanyonClientRoom, slotId: string): string {
  return room.state.slots.get(slotId)?.selectedCharacterId ?? "";
}

function unitSelectionSyncedToRooms(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
  slotId: string,
  characterId: string,
): boolean {
  return unitSelectionSyncedToRoom(firstRoom, slotId, characterId) && unitSelectionSyncedToRoom(secondRoom, slotId, characterId);
}

function unitSelectionSyncedToRoom(
  room: GravityCanyonClientRoom,
  slotId: string,
  characterId: string,
): boolean {
  const slot = room.state.slots.get(slotId);
  return slot?.selectedCharacterId === characterId && slot.characterSelected === true;
}

function playerReady(room: GravityCanyonClientRoom, sessionId: string): boolean {
  return room.state.players.get(sessionId)?.ready ?? false;
}

function vehicleHp(room: GravityCanyonClientRoom, vehicleId: string): number {
  return room.state.vehicles.find((vehicle) => vehicle.vehicleId === vehicleId)?.hp ?? 0;
}

function vehicleX(room: GravityCanyonClientRoom, vehicleId: string): number {
  return room.state.vehicles.find((vehicle) => vehicle.vehicleId === vehicleId)?.x ?? 0;
}

function vehicleAngle(room: GravityCanyonClientRoom, vehicleId: string): number {
  return room.state.vehicles.find((vehicle) => vehicle.vehicleId === vehicleId)?.angle ?? 0;
}
