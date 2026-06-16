import assert from "node:assert/strict";
import test from "node:test";
import { Client, type Room as ClientRoom } from "@colyseus/sdk";
import { Server } from "colyseus";
import { GravityCanyonRoom } from "./GravityCanyonRoom.js";
import type { GravityCanyonState } from "../schema/GravityCanyonState.js";

type GravityCanyonClientRoom = ClientRoom<unknown, GravityCanyonState>;

test("auto-room playtest flow puts two clients in one combat preview", async () => {
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

    await waitFor(() => Boolean(firstJoinedRoom.state.blueCaptainSessionId), "second captain assignment");

    assert.equal(firstJoinedRoom.roomId, secondJoinedRoom.roomId);
    assert.equal(firstJoinedRoom.state.roomCode, "auto-room");
    assert.equal(firstJoinedRoom.state.redCaptainSessionId, firstJoinedRoom.sessionId);
    assert.equal(firstJoinedRoom.state.blueCaptainSessionId, secondJoinedRoom.sessionId);
    assert.equal(firstJoinedRoom.state.players.get(firstJoinedRoom.sessionId)?.role, "red-captain");
    assert.equal(firstJoinedRoom.state.players.get(secondJoinedRoom.sessionId)?.role, "blue-captain");

    firstJoinedRoom.send("setMode", { mode: "1v1" });
    firstJoinedRoom.send("selectCharacter", { slotId: "red-1", characterId: "kaelii" });
    secondJoinedRoom.send("selectCharacter", { slotId: "blue-1", characterId: "perlah" });
    firstJoinedRoom.send("setReady", { ready: true });
    secondJoinedRoom.send("setReady", { ready: true });

    await waitFor(() => firstJoinedRoom.state.phase === "combat-preview", "combat preview start");

    assert.equal(firstJoinedRoom.state.mode, "1v1");
    assert.equal(firstJoinedRoom.state.phase, "combat-preview");
    assert.deepEqual(
      Array.from(firstJoinedRoom.state.vehicles).map((vehicle) => ({
        vehicleId: vehicle.vehicleId,
        ownerSessionId: vehicle.ownerSessionId,
        team: vehicle.team,
        className: vehicle.className,
      })),
      [
        {
          vehicleId: "red-1",
          ownerSessionId: firstJoinedRoom.sessionId,
          team: "red",
          className: "Flashkick Skip-Rig",
        },
        {
          vehicleId: "blue-1",
          ownerSessionId: secondJoinedRoom.sessionId,
          team: "blue",
          className: "Sunspike Embercart",
        },
      ],
    );
  } finally {
    await secondRoom?.leave();
    await firstRoom?.leave();
    await gameServer.gracefullyShutdown(false);
  }
});

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
