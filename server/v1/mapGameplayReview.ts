import type { SeatId } from "./rules.js";

export type GameplayMapId = "ring-basin" | "bridgeworks";

export type ZoneBand = {
  label: string;
  x1: number;
  x2: number;
  note: string;
};

export type MovementRoute = {
  label: string;
  from: SeatId;
  toX: number;
  note: string;
};

export type DestructibleFocus = {
  label: string;
  x: number;
  y: number;
  radius: number;
  note: string;
};

export type OpeningRead = {
  label: string;
  from: SeatId;
  to: SeatId;
  note: string;
};

export type MapGameplayReview = {
  mapId: GameplayMapId;
  title: string;
  promise: string;
  safeSpawnSeatIds: readonly SeatId[];
  dangerZones: readonly ZoneBand[];
  movementRoutes: readonly MovementRoute[];
  destructibleFocus: readonly DestructibleFocus[];
  openingReads: readonly OpeningRead[];
  funFactors: readonly string[];
  riskNotes: readonly string[];
};

export const GAMEPLAY_REVIEWS: readonly MapGameplayReview[] = [
  {
    mapId: "ring-basin",
    title: "Ring Basin Gameplay Review",
    promise: "A bowl-control map where high balconies shoot down into circular recovery tiers and low seats can lob back upward.",
    safeSpawnSeatIds: ["red-1", "blue-1", "red-2", "blue-2"],
    dangerZones: [
      {
        label: "center low basin",
        x1: 1040,
        x2: 1360,
        note: "Low ground should feel recoverable, not like an instant-loss pit.",
      },
      {
        label: "outer bowl lips",
        x1: 870,
        x2: 1530,
        note: "Crater damage here can turn a safe bowl into a bunge threat.",
      },
    ],
    movementRoutes: [
      {
        label: "red high balcony to basin lip",
        from: "red-2",
        toX: 910,
        note: "High red can move toward cluster angles without crossing a gap.",
      },
      {
        label: "blue high balcony to basin lip",
        from: "blue-2",
        toX: 1490,
        note: "High blue mirrors the route so the map does not favor one side.",
      },
    ],
    destructibleFocus: [
      {
        label: "left ring lip",
        x: 910,
        y: 672,
        radius: 90,
        note: "Breaking this lip changes rolling and cluster behavior into the basin.",
      },
      {
        label: "right ring lip",
        x: 1490,
        y: 672,
        radius: 90,
        note: "The mirrored lip creates a readable target without deleting a spawn.",
      },
      {
        label: "center basin floor",
        x: 1200,
        y: 802,
        radius: 110,
        note: "Repeated hits deepen the arena center but should not one-shot a player.",
      },
    ],
    openingReads: [
      {
        label: "low red shoots up",
        from: "red-1",
        to: "blue-2",
        note: "Shows whether a lower player can threaten a high balcony.",
      },
      {
        label: "high red shoots down",
        from: "red-2",
        to: "blue-1",
        note: "Tests whether high ground feels powerful but not automatic.",
      },
    ],
    funFactors: [
      "Circular bowls make terrain damage easy to understand because craters visually compound the basin shape.",
      "Kaelii-style rolling shots and Perlah-style cluster shots have natural targets without needing extra weapon rules.",
      "High and low seats create a real turn-one aiming decision rather than only left-to-right firing.",
    ],
    riskNotes: [
      "Closed rings would be confusing for movement and collision, so v1 should use broken arcs and bowls instead.",
      "The low basin must remain playable; if it becomes a trap with no useful shots, the map will feel punitive.",
      "Outer balcony spawns need enough width that early terrain damage does not erase a player before they act.",
    ],
  },
  {
    mapId: "bridgeworks",
    title: "Bridgeworks Gameplay Review",
    promise: "A broken-span map where players fight over bridge lanes while spawns remain on wider, safer ledges.",
    safeSpawnSeatIds: ["red-1", "blue-1", "red-2", "blue-2"],
    dangerZones: [
      {
        label: "low broken span",
        x1: 900,
        x2: 1500,
        note: "The lower bridge should invite bunge plays without forcing everyone onto narrow land.",
      },
      {
        label: "center air gap",
        x1: 1030,
        x2: 1370,
        note: "The central gap makes wind and vertical aiming matter.",
      },
    ],
    movementRoutes: [
      {
        label: "red low seat to low bridge",
        from: "red-2",
        toX: 760,
        note: "A player can contest the bridge, but does not spawn on it.",
      },
      {
        label: "blue low seat to low bridge",
        from: "blue-2",
        toX: 1620,
        note: "Mirrored low bridge access supports 2v2 pressure from both sides.",
      },
    ],
    destructibleFocus: [
      {
        label: "high center bridge",
        x: 1200,
        y: 574,
        radius: 95,
        note: "Damage here can open a new vertical lane without instantly ending the match.",
      },
      {
        label: "left low bridge",
        x: 760,
        y: 704,
        radius: 80,
        note: "Breaking the bridge lip creates a bunge setup against low-seat movement.",
      },
      {
        label: "right low bridge",
        x: 1620,
        y: 704,
        radius: 80,
        note: "The mirrored low bridge keeps the tactical puzzle fair.",
      },
    ],
    openingReads: [
      {
        label: "low red shoots up",
        from: "red-2",
        to: "blue-1",
        note: "Tests a steep lob through the bridge lattice.",
      },
      {
        label: "high red shoots down",
        from: "red-1",
        to: "blue-2",
        note: "Tests whether high-side ledges can threaten bridge contesters.",
      },
    ],
    funFactors: [
      "Many spans create more target choices than a single central bridge.",
      "Destroying bridge lips changes movement and bunge pressure in a way playtesters can understand immediately.",
      "The map has strong identity while still using normal v1 terrain rules.",
    ],
    riskNotes: [
      "If bridge spans are too thin, normal splash damage will make the map feel random and brittle.",
      "Players should not spawn on the narrowest bridges; the bridges are objectives, not starting traps.",
      "Too many overlapping spans can make projectile paths hard to read, so the visual style must preserve clear air lanes.",
    ],
  },
];

export function reviewForMapId(mapId: string) {
  return GAMEPLAY_REVIEWS.find((review) => review.mapId === mapId);
}
