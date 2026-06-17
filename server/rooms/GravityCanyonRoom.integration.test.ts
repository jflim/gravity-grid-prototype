import assert from "node:assert/strict";
import test from "node:test";
import { Client, type Room as ClientRoom } from "@colyseus/sdk";
import { Server } from "colyseus";
import { GravityCanyonRoom } from "./GravityCanyonRoom.js";
import type { GravityCanyonState } from "../schema/GravityCanyonState.js";

type GravityCanyonClientRoom = ClientRoom<unknown, GravityCanyonState>;
type TwoClientRooms = {
  firstRoom: GravityCanyonClientRoom;
  secondRoom: GravityCanyonClientRoom;
};

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

test("server rejects forged lobby actions that are disabled in the UI", async () => {
  await withTwoClientRooms(assertForgedLobbyActionsRejected);
});

test("server rejects forged gameplay actions that are disabled in the UI", async () => {
  await withTwoClientRooms(assertForgedGameplayActionsRejected);
});

async function assertForgedLobbyActionsRejected({ firstRoom, secondRoom }: TwoClientRooms) {
  await assertNonHostModeChangeRejected(firstRoom, secondRoom);
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
  secondRoom.send("claimSeat", { slotId: "red-1" });
  secondRoom.send("selectCharacter", { slotId: "blue-1", characterId: "nova" });
  secondRoom.send("previewFire");
  await settleMessages();

  assert.equal(firstRoom.state.phase, "combat-preview");
  assert.equal(firstRoom.state.mode, "1v1");
  assert.equal(playerReady(firstRoom, firstRoom.sessionId), true);
  assert.equal(slotOwner(firstRoom, "red-1"), firstRoom.sessionId);
  assert.equal(selectedCharacter(firstRoom, "blue-1"), "perlah");
  assert.equal(vehicleHp(firstRoom, "blue-1"), 100);
}

async function assertNonHostNextRoundRejected(
  firstRoom: GravityCanyonClientRoom,
  secondRoom: GravityCanyonClientRoom,
) {
  await playPreviewRoundToEnd(firstRoom, secondRoom);
  const roundNumber = firstRoom.state.roundNumber;

  secondRoom.send("startNextRound");
  await settleMessages();
  assert.equal(firstRoom.state.phase, "round-over");
  assert.equal(firstRoom.state.roundNumber, roundNumber);

  firstRoom.send("startNextRound");
  await waitFor(
    () => firstRoom.state.phase === "combat-preview" && firstRoom.state.roundNumber === roundNumber + 1,
    "host next round start",
  );
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

async function playPreviewRoundToEnd(firstRoom: GravityCanyonClientRoom, secondRoom: GravityCanyonClientRoom) {
  while (firstRoom.state.phase !== "round-over") {
    const turnNumber = firstRoom.state.turnNumber;
    const activeVehicle = firstRoom.state.vehicles.find(
      (vehicle) => vehicle.vehicleId === firstRoom.state.activeVehicleId,
    );
    const activeRoom = activeVehicle?.ownerSessionId === firstRoom.sessionId ? firstRoom : secondRoom;

    activeRoom.send("previewFire");
    await waitFor(
      () => firstRoom.state.phase === "round-over" || firstRoom.state.turnNumber > turnNumber,
      `preview shot ${turnNumber}`,
    );
  }
}

async function waitFor(predicate: () => boolean, label: string) {
  const deadline = Date.now() + 3_000;
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

function playerReady(room: GravityCanyonClientRoom, sessionId: string): boolean {
  return room.state.players.get(sessionId)?.ready ?? false;
}

function vehicleHp(room: GravityCanyonClientRoom, vehicleId: string): number {
  return room.state.vehicles.find((vehicle) => vehicle.vehicleId === vehicleId)?.hp ?? 0;
}
