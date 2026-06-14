import type {
  CharacterId,
  CharacterPose,
  ClassId,
  CombatHullShape,
  Facing,
  SpriteDisplaySize,
  TeamId,
  VehicleId,
} from "../model/gameTypes.js";
import { SHARED_V1_VEHICLE_HIT_ZONE } from "./v1CollisionProfiles.js";

export { SHARED_V1_VEHICLE_HIT_ZONE } from "./v1CollisionProfiles.js";

export type CharacterSpriteSet = Record<CharacterPose, string>;
export type CharacterDisplaySet = Record<CharacterPose, SpriteDisplaySize>;
export type UnitConceptSpriteSet = Record<CharacterPose, string>;
export type UnitConceptDisplaySet = Record<CharacterPose, SpriteDisplaySize>;

export interface V1DemoUnitDefinition {
  id: VehicleId;
  characterId: CharacterId;
  username: string;
  team: TeamId;
  classId: ClassId;
  className: string;
  color: number;
  accent: number;
  vehicleSpriteKey: string;
  vehicleDestroyedSpriteKey: string;
  vehicleSpriteFaces: Facing;
  vehicleDisplay: SpriteDisplaySize;
  vehicleDestroyedDisplay: SpriteDisplaySize;
  characterSpriteKeys: CharacterSpriteSet;
  characterSpriteFaces: Facing;
  characterDisplays: CharacterDisplaySet;
  characterOffsetX: number;
  characterOffsetY: number;
  unitConceptSpriteKeys?: UnitConceptSpriteSet;
  unitConceptDisplays?: UnitConceptDisplaySet;
  unitConceptSpriteFaces?: Facing;
  unitConceptOffsetY?: number;
  combatHull: CombatHullShape;
  portraitKey: string;
}

export const V1_DEMO_UNIT_DEFINITIONS = [
  {
    id: "red-1",
    characterId: "nova",
    username: "Nova",
    team: "red",
    classId: "bunger",
    className: "Bunger Rig",
    color: 0xff4d5d,
    accent: 0xffd166,
    vehicleSpriteKey: "nova-vehicle-sprite",
    vehicleDestroyedSpriteKey: "nova-vehicle-destroyed",
    vehicleSpriteFaces: 1,
    vehicleDisplay: { width: 254, height: 155 },
    vehicleDestroyedDisplay: { width: 260, height: 211 },
    characterSpriteKeys: {
      default: "nova-character-default",
      ko: "nova-character-ko",
      intense: "nova-character-intense",
    },
    characterSpriteFaces: 1,
    characterDisplays: {
      default: { width: 112, height: 150 },
      ko: { width: 250, height: 94 },
      intense: { width: 166, height: 148 },
    },
    characterOffsetX: -36,
    characterOffsetY: -34,
    unitConceptSpriteKeys: {
      default: "nova-unit-default-concept",
      intense: "nova-unit-intense",
      ko: "nova-unit-ko-concept",
    },
    unitConceptDisplays: {
      default: { width: 350, height: 233 },
      intense: { width: 350, height: 233 },
      ko: { width: 354, height: 212 },
    },
    unitConceptSpriteFaces: 1,
    unitConceptOffsetY: 28,
    combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
    portraitKey: "nova-vehicle",
  },
  {
    id: "blue-1",
    characterId: "vesper",
    username: "Vesper",
    team: "blue",
    classId: "glitch",
    className: "Glitch Rover",
    color: 0x4cc9f0,
    accent: 0xb8f7ff,
    vehicleSpriteKey: "vesper-vehicle-sprite",
    vehicleDestroyedSpriteKey: "vesper-vehicle-destroyed",
    vehicleSpriteFaces: -1,
    vehicleDisplay: { width: 250, height: 160 },
    vehicleDestroyedDisplay: { width: 260, height: 169 },
    characterSpriteKeys: {
      default: "vesper-character-default",
      ko: "vesper-character-ko",
      intense: "vesper-character-intense",
    },
    characterSpriteFaces: -1,
    characterDisplays: {
      default: { width: 108, height: 151 },
      ko: { width: 154, height: 149 },
      intense: { width: 139, height: 150 },
    },
    characterOffsetX: 54,
    characterOffsetY: -34,
    unitConceptSpriteKeys: {
      default: "vesper-unit-default-concept",
      intense: "vesper-unit-intense",
      ko: "vesper-unit-ko-concept",
    },
    unitConceptDisplays: {
      default: { width: 356, height: 208 },
      intense: { width: 356, height: 208 },
      ko: { width: 356, height: 208 },
    },
    unitConceptSpriteFaces: -1,
    unitConceptOffsetY: 25,
    combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
    portraitKey: "vesper-vehicle",
  },
  {
    id: "red-2",
    characterId: "kaelii",
    username: "Kaelii",
    team: "red",
    classId: "bouncer",
    className: "Flashkick Skip-Rig",
    color: 0xff4fb4,
    accent: 0xffd1f0,
    vehicleSpriteKey: "kaelii-vehicle-sprite",
    vehicleDestroyedSpriteKey: "kaelii-vehicle-destroyed",
    vehicleSpriteFaces: 1,
    vehicleDisplay: { width: 1, height: 1 },
    vehicleDestroyedDisplay: { width: 1, height: 1 },
    characterSpriteKeys: {
      default: "kaelii-unit-default",
      ko: "kaelii-unit-ko",
      intense: "kaelii-unit-intense",
    },
    characterSpriteFaces: 1,
    characterDisplays: {
      default: { width: 350, height: 233 },
      ko: { width: 354, height: 212 },
      intense: { width: 350, height: 233 },
    },
    characterOffsetX: 0,
    characterOffsetY: 24,
    unitConceptSpriteKeys: {
      default: "kaelii-unit-default",
      intense: "kaelii-unit-intense",
      ko: "kaelii-unit-ko",
    },
    unitConceptDisplays: {
      default: { width: 350, height: 233 },
      intense: { width: 350, height: 233 },
      ko: { width: 354, height: 212 },
    },
    unitConceptSpriteFaces: 1,
    unitConceptOffsetY: 28,
    combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
    portraitKey: "kaelii-unit-default",
  },
  {
    id: "blue-2",
    characterId: "perlah",
    username: "Perlah",
    team: "blue",
    classId: "spark",
    className: "Sunspike Embercart",
    color: 0xff8a24,
    accent: 0xffd166,
    vehicleSpriteKey: "perlah-vehicle-sprite",
    vehicleDestroyedSpriteKey: "perlah-vehicle-destroyed",
    vehicleSpriteFaces: 1,
    vehicleDisplay: { width: 1, height: 1 },
    vehicleDestroyedDisplay: { width: 1, height: 1 },
    characterSpriteKeys: {
      default: "perlah-unit-default",
      ko: "perlah-unit-ko",
      intense: "perlah-unit-intense",
    },
    characterSpriteFaces: 1,
    characterDisplays: {
      default: { width: 356, height: 208 },
      ko: { width: 354, height: 212 },
      intense: { width: 356, height: 208 },
    },
    characterOffsetX: 0,
    characterOffsetY: 25,
    unitConceptSpriteKeys: {
      default: "perlah-unit-default",
      intense: "perlah-unit-intense",
      ko: "perlah-unit-ko",
    },
    unitConceptDisplays: {
      default: { width: 356, height: 208 },
      intense: { width: 356, height: 208 },
      ko: { width: 354, height: 212 },
    },
    unitConceptSpriteFaces: 1,
    unitConceptOffsetY: 25,
    combatHull: SHARED_V1_VEHICLE_HIT_ZONE,
    portraitKey: "perlah-unit-default",
  },
] as const satisfies readonly V1DemoUnitDefinition[];

export function unitDefinitionForCharacter(characterId: CharacterId): V1DemoUnitDefinition {
  const unit = V1_DEMO_UNIT_DEFINITIONS.find((definition) => definition.characterId === characterId);
  if (!unit) {
    throw new Error(`Unknown v1 character: ${characterId}`);
  }
  return unit;
}
