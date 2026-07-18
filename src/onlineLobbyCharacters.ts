import { DEMO_UNIT_DEFINITIONS, type DemoUnitDefinition } from "../shared/content/v1Units.js";
import type { CharacterId, Facing } from "../shared/model/gameTypes.js";

export type LobbyCharacterCard = {
  characterId: CharacterId;
  name: string;
  vehicleName: string;
  roleName: string;
  playstyleSummary: string;
  strengths: readonly string[];
  contextStatus: string;
  contextStatusTone: "implemented" | "design";
  pilotImage: string;
  vehicleImage: string;
  unitImage: string;
  unitImageFaces: Facing;
  needsLobbyArt: boolean;
};

type LobbyCharacterContext = Pick<
  LobbyCharacterCard,
  "roleName" | "playstyleSummary" | "strengths" | "contextStatus" | "contextStatusTone"
>;

const CONTEXT_STATUS = {
  implemented: {
    label: "Implemented prototype",
    tone: "implemented",
  },
  design: {
    label: "Design direction",
    tone: "design",
  },
} as const satisfies Record<string, { label: string; tone: LobbyCharacterCard["contextStatusTone"] }>;

const PILOT_IMAGE_KEYS: Partial<Record<CharacterId, string>> = {
  nova: "nova-character-default",
  vesper: "vesper-character-default",
};

const UNIT_CONTEXT: Record<CharacterId, LobbyCharacterContext> = {
  nova: {
    roleName: "Terrain Breaker",
    playstyleSummary: "Carves larger craters and shoves enemies toward gaps.",
    strengths: ["Crater control", "Void Drop setup"],
    contextStatus: CONTEXT_STATUS.implemented.label,
    contextStatusTone: CONTEXT_STATUS.implemented.tone,
  },
  vesper: {
    roleName: "Gravity Control",
    playstyleSummary: "Designed around pull-field setup and enemy repositioning.",
    strengths: ["Edge pressure", "Setup play"],
    contextStatus: CONTEXT_STATUS.design.label,
    contextStatusTone: CONTEXT_STATUS.design.tone,
  },
  kaelii: {
    roleName: "Trick Shot",
    playstyleSummary: "Planned bounce and ricochet pressure for awkward terrain.",
    strengths: ["Ricochet angles", "Crater punishment"],
    contextStatus: CONTEXT_STATUS.design.label,
    contextStatusTone: CONTEXT_STATUS.design.tone,
  },
  perlah: {
    roleName: "Spark Pressure",
    playstyleSummary: "Planned charged impact or heat-zone pressure.",
    strengths: ["Charged impact", "Area pressure"],
    contextStatus: CONTEXT_STATUS.design.label,
    contextStatusTone: CONTEXT_STATUS.design.tone,
  },
};

export const LOBBY_CHARACTER_CARDS: LobbyCharacterCard[] = DEMO_UNIT_DEFINITIONS.map((unit: DemoUnitDefinition) => {
  const pilotKey = PILOT_IMAGE_KEYS[unit.characterId] ?? unit.characterSpriteKeys.default;
  const context = UNIT_CONTEXT[unit.characterId];
  return {
    characterId: unit.characterId,
    name: unit.username,
    vehicleName: unit.className,
    ...context,
    pilotImage: assetPath(pilotKey),
    vehicleImage: assetPath(unit.vehicleSpriteKey),
    unitImage: assetPath(unit.characterSpriteKeys.default),
    unitImageFaces: unit.characterSpritePoseFaces?.default ?? unit.characterSpriteFaces,
    needsLobbyArt: PILOT_IMAGE_KEYS[unit.characterId] === undefined,
  };
});

export function lobbyCharacterCardFor(characterId: string | undefined): LobbyCharacterCard {
  return LOBBY_CHARACTER_CARDS.find((card) => card.characterId === characterId) ?? LOBBY_CHARACTER_CARDS[0]!;
}

function assetPath(key: string): string {
  return `/assets/${key}.webp`;
}
