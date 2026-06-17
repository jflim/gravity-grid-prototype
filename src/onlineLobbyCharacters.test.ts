import assert from "node:assert/strict";
import test from "node:test";
import { LOBBY_CHARACTER_CARDS, lobbyCharacterCardFor } from "./onlineLobbyCharacters";

test("lobby character cards expose pilot and ride art for the v1 roster", () => {
  assert.deepEqual(
    LOBBY_CHARACTER_CARDS.map((card) => card.characterId),
    ["nova", "vesper", "kaelii", "perlah"],
  );

  for (const card of LOBBY_CHARACTER_CARDS) {
    assert.match(card.pilotImage, /^\/assets\/.+\.webp$/);
    assert.match(card.rideImage, /^\/assets\/.+\.webp$/);
    assert.ok(card.name.length > 0);
    assert.ok(card.rideName.length > 0);
  }
});

test("lobbyCharacterCardFor falls back to Nova for invalid or missing ids", () => {
  assert.equal(lobbyCharacterCardFor("vesper").name, "Vesper");
  assert.equal(lobbyCharacterCardFor("not-real").name, "Nova");
});
