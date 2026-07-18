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
    title: "Ringworks Basin Gameplay Review",
    promise: "A weapon-readable canyon map where side bowls fight around a destructible broken ring bridge and two readable void gaps.",
    safeSpawnSeatIds: ["red-1", "blue-1", "red-2", "blue-2"],
    dangerZones: [
      {
        label: "left bridge gap",
        x1: 805,
        x2: 1135,
        note: "Readable air gap for Void Drop pressure without tiny-slot confusion.",
      },
      {
        label: "right bridge gap",
        x1: 1265,
        x2: 1595,
        note: "Mirrors the left gap so pulls, craters, and knockback matter on both sides.",
      },
    ],
    movementRoutes: [
      {
        label: "red bowl to high lip",
        from: "red-2",
        toX: 790,
        note: "High red can stage near the ring gap for pressure while the lower red bowl remains a playable pocket.",
      },
      {
        label: "blue bowl to high lip",
        from: "blue-2",
        toX: 1610,
        note: "High blue mirrors the ring-gap pressure while the lower blue bowl gives the side a second tactical height.",
      },
    ],
    destructibleFocus: [
      {
        label: "red high lip",
        x: 735,
        y: 560,
        radius: 90,
        note: "Nova can carve the shelf edge to create Void Drop pressure without deleting the lower spawn instantly.",
      },
      {
        label: "ring bridge cap",
        x: 1200,
        y: 560,
        radius: 105,
        note: "Repeated hits can open the middle target or give Perlah cluster shots a compact objective.",
      },
      {
        label: "blue high lip",
        x: 1715,
        y: 560,
        radius: 90,
        note: "Mirrors the red lip and gives Vesper pull shots a clear edge target.",
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
      "The center ring cap gives the map a memorable structure while still using ordinary destructible terrain.",
      "Kaelii-style rolling shots, Vesper pull shots, Nova craters, and Perlah clusters each have natural terrain targets.",
      "Deep side bowls plus high staging lips create more interesting decisions than a plain slope duel.",
      "Two readable void gaps create bunge pressure without relying on tiny slots that look unfair with large sprites.",
    ],
    riskNotes: [
      "The current heightmap cannot make true over-under bridges, so the ring should read as a raised cap plus visual landmark.",
      "If the high lips are too dominant, players may ignore the lower bowls and only fish for knockoffs.",
      "The ring cap should invite shots and lane changes, not become a confusing permanent wall.",
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
