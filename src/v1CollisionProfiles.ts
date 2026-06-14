import type { CollisionArtRuleInput } from "./collisionArtRule";
export { SHARED_V1_VEHICLE_HIT_ZONE } from "../shared/content/v1CollisionProfiles.js";
import { SHARED_V1_VEHICLE_HIT_ZONE } from "../shared/content/v1CollisionProfiles.js";

export const V1_COLLISION_ART_REVIEWS: readonly CollisionArtRuleInput[] = [
  {
    unitId: "nova",
    display: { width: 350, height: 233 },
    hitZone: SHARED_V1_VEHICLE_HIT_ZONE,
    pilotPose: "seated",
    protectionCue: "armored-platform",
    notes: "Nova reads as mounted inside the heavy cannon rig silhouette.",
  },
  {
    unitId: "vesper",
    display: { width: 356, height: 208 },
    hitZone: SHARED_V1_VEHICLE_HIT_ZONE,
    pilotPose: "seated",
    protectionCue: "cockpit",
    notes: "Vesper reads as seated into the rover deck behind the cannon body.",
  },
  {
    unitId: "kaelii",
    display: { width: 350, height: 233 },
    hitZone: SHARED_V1_VEHICLE_HIT_ZONE,
    pilotPose: "standing",
    protectionCue: "guard-rail",
    notes: "Kaelii's high pose is accepted only because the skip-rig frame/rails must read as protecting her.",
  },
  {
    unitId: "perlah",
    display: { width: 356, height: 208 },
    hitZone: SHARED_V1_VEHICLE_HIT_ZONE,
    pilotPose: "crouched",
    protectionCue: "armored-platform",
    notes: "Perlah reads as tucked into the embercart platform and cannon mass.",
  },
];
