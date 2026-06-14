import type Phaser from "phaser";
import type { CombatMarkerKind } from "../../../shared/model/gameTypes.js";

export interface CombatMarker {
  kind: CombatMarkerKind;
  label: string;
  x: number;
  y: number;
  age: number;
  duration: number;
  lift: number;
  text: Phaser.GameObjects.Text;
}
