import { MAPS } from "../server/v1/maps.js";

export type OnlineLobbyMapOption = {
  id: string;
  name: string;
  summary: string;
  tacticalRole: string;
  random: boolean;
};

export const ONLINE_LOBBY_MAP_OPTIONS: readonly OnlineLobbyMapOption[] = [
  {
    id: "random",
    name: "Random Map",
    summary: `Server picks from the ${MAPS.length} map v1 pool.`,
    tacticalRole: "surprise rotation",
    random: true,
  },
  ...MAPS.map((map) => ({
    id: map.id,
    name: map.name,
    summary: map.summary,
    tacticalRole: map.tacticalRole,
    random: false,
  })),
];

export const ONLINE_LOBBY_FIXED_MAP_COUNT = MAPS.length;

export function onlineLobbyMapOptionFor(mapPick: string): OnlineLobbyMapOption {
  return ONLINE_LOBBY_MAP_OPTIONS.find((option) => option.id === mapPick) ?? ONLINE_LOBBY_MAP_OPTIONS[0];
}

export function onlineLobbyFixedMapIndex(mapPick: string): number {
  return MAPS.findIndex((map) => map.id === mapPick);
}
