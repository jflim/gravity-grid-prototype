import { DEMO_UNIT_DEFINITIONS } from "../shared/content/v1Units.js";
import type { CharacterId } from "../shared/model/gameTypes.js";

export type LobbyCharacterCard = {
  characterId: CharacterId;
  name: string;
  rideName: string;
  pilotImage: string;
  rideImage: string;
  unitImage: string;
  needsLobbyArt: boolean;
};

const PILOT_IMAGE_KEYS: Partial<Record<CharacterId, string>> = {
  nova: "nova-character-default",
  vesper: "vesper-character-default",
};

export const LOBBY_CHARACTER_CARDS: LobbyCharacterCard[] = DEMO_UNIT_DEFINITIONS.map((unit) => {
  const pilotKey = PILOT_IMAGE_KEYS[unit.characterId] ?? unit.characterSpriteKeys.default;
  return {
    characterId: unit.characterId,
    name: unit.username,
    rideName: unit.className,
    pilotImage: assetPath(pilotKey),
    rideImage: assetPath(unit.vehicleSpriteKey),
    unitImage: assetPath(unit.characterSpriteKeys.default),
    needsLobbyArt: PILOT_IMAGE_KEYS[unit.characterId] === undefined,
  };
});

export function lobbyCharacterCardFor(characterId: string | undefined): LobbyCharacterCard {
  return LOBBY_CHARACTER_CARDS.find((card) => card.characterId === characterId) ?? LOBBY_CHARACTER_CARDS[0]!;
}

function assetPath(key: string): string {
  return `/assets/${key}.webp`;
}
