import assert from "node:assert/strict";
import test from "node:test";
import { LOBBY_CHARACTER_CARDS, lobbyCharacterCardFor } from "./onlineLobbyCharacters";

test("lobby character cards expose pilot and vehicle art for the v1 roster", () => {
  assert.deepEqual(
    LOBBY_CHARACTER_CARDS.map((card) => card.characterId),
    ["nova", "vesper", "kaelii", "perlah"],
  );

  for (const card of LOBBY_CHARACTER_CARDS) {
    assert.match(card.pilotImage, /^\/assets\/.+\.webp$/);
    assert.match(card.vehicleImage, /^\/assets\/.+\.webp$/);
    assert.ok(card.name.length > 0);
    assert.ok(card.vehicleName.length > 0);
  }
});

test("lobby character cards expose playstyle context without numeric stats", () => {
  const nova = lobbyCharacterCardFor("nova");
  assert.equal(nova.roleName, "Terrain Breaker");
  assert.equal(nova.contextStatus, "Implemented prototype");
  assert.match(nova.playstyleSummary, /craters/i);
  assert.deepEqual(nova.strengths, ["Crater control", "Void Drop setup"]);

  const plannedCards = LOBBY_CHARACTER_CARDS.filter((card) => card.characterId !== "nova");
  assert.ok(plannedCards.every((card) => card.contextStatus === "Design direction"));
  assert.ok(plannedCards.every((card) => card.strengths.length >= 2));
});

test("lobbyCharacterCardFor falls back to Nova for invalid or missing ids", () => {
  assert.equal(lobbyCharacterCardFor("vesper").name, "Vesper");
  assert.equal(lobbyCharacterCardFor("not-real").name, "Nova");
});
