import Phaser from "phaser";
import type { CharacterPose } from "../../../shared/model/gameTypes.js";
import {
  scaleBattlefieldDisplay,
  scaleBattlefieldOffset,
} from "../../combatPresentation";
import type { VehicleState } from "../MatchTypes";
import { VehicleGeometry } from "../VehicleGeometry";

export interface VehicleSpriteLayerOptions {
  scene: Phaser.Scene;
  useUnitConceptPreview: boolean;
}

export interface DrawVehicleSpriteInput {
  vehicle: VehicleState;
  active: boolean;
  charging: boolean;
  renderX: number;
  renderY: number;
  alpha: number;
  slopeAngle: number;
  koTilt: number;
  tint?: number;
}

export class VehicleSpriteLayer {
  private readonly vehicleSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly characterSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly vehicleGeometry = new VehicleGeometry();

  constructor(private readonly options: VehicleSpriteLayerOptions) {}

  draw(input: DrawVehicleSpriteInput): void {
    const { vehicle, renderX, renderY, alpha, slopeAngle, koTilt } = input;
    const vehicleKey = vehicle.alive ? vehicle.vehicleSpriteKey : vehicle.vehicleDestroyedSpriteKey;
    const vehicleDisplay = scaleBattlefieldDisplay(
      vehicle.alive ? vehicle.vehicleDisplay : vehicle.vehicleDestroyedDisplay,
    );
    const vehicleSprite =
      this.vehicleSprites.get(vehicle.id) ?? this.options.scene.add.image(renderX, renderY, vehicleKey);
    if (!this.vehicleSprites.has(vehicle.id)) {
      vehicleSprite.setDepth(11);
      this.vehicleSprites.set(vehicle.id, vehicleSprite);
    }

    if (
      this.options.useUnitConceptPreview &&
      vehicle.unitConceptSpriteKeys &&
      vehicle.unitConceptDisplays &&
      vehicle.unitConceptSpriteFaces
    ) {
      const conceptPose = this.characterPoseFor(vehicle, input.active, input.charging);
      const conceptKey = vehicle.unitConceptSpriteKeys[conceptPose];
      const conceptDisplay = scaleBattlefieldDisplay(vehicle.unitConceptDisplays[conceptPose]);
      const conceptSpriteFaces = this.spriteFacesForPose(
        vehicle.unitConceptSpriteFaces,
        vehicle.unitConceptSpritePoseFaces,
        conceptPose,
      );
      vehicleSprite
        .setTexture(conceptKey)
        .setOrigin(0.5, 0.86)
        .setPosition(renderX, renderY + scaleBattlefieldOffset(vehicle.unitConceptOffsetY ?? 24))
        .setDisplaySize(conceptDisplay.width, conceptDisplay.height)
        .setFlipX(vehicle.facing !== conceptSpriteFaces)
        .setAlpha(alpha)
        .setAngle(slopeAngle + koTilt);
      this.applyTint(vehicleSprite, input.tint);
      this.characterSprites.get(vehicle.id)?.setAlpha(0);
      return;
    }

    vehicleSprite
      .setTexture(vehicleKey)
      .setOrigin(0.5, 0.86)
      .setPosition(renderX, renderY + scaleBattlefieldOffset(20))
      .setDisplaySize(vehicleDisplay.width, vehicleDisplay.height)
      .setFlipX(vehicle.facing !== vehicle.vehicleSpriteFaces)
      .setAlpha(alpha)
      .setAngle(slopeAngle + koTilt);
    this.applyTint(vehicleSprite, input.tint);

    const characterPose = this.characterPoseFor(vehicle, input.active, input.charging);
    const characterKey = vehicle.characterSpriteKeys[characterPose];
    const characterDisplay = scaleBattlefieldDisplay(vehicle.characterDisplays[characterPose]);
    const characterSpriteFaces = this.spriteFacesForPose(
      vehicle.characterSpriteFaces,
      vehicle.characterSpritePoseFaces,
      characterPose,
    );
    const characterX = renderX + this.vehicleGeometry.orientedOffset(
      vehicle,
      scaleBattlefieldOffset(vehicle.characterOffsetX),
      characterSpriteFaces,
    );
    const characterSprite =
      this.characterSprites.get(vehicle.id) ?? this.options.scene.add.image(characterX, renderY, characterKey);
    if (!this.characterSprites.has(vehicle.id)) {
      characterSprite.setDepth(12);
      this.characterSprites.set(vehicle.id, characterSprite);
    }
    characterSprite
      .setTexture(characterKey)
      .setOrigin(0.5, 0.88)
      .setPosition(characterX, renderY + scaleBattlefieldOffset(vehicle.characterOffsetY))
      .setDisplaySize(characterDisplay.width, characterDisplay.height)
      .setFlipX(vehicle.facing !== characterSpriteFaces)
      .setAlpha(alpha)
      .setAngle(slopeAngle + koTilt);
    this.applyTint(characterSprite, input.tint);
  }

  private characterPoseFor(vehicle: VehicleState, active: boolean, charging: boolean): CharacterPose {
    if (!vehicle.alive) {
      return "ko";
    }

    return active && charging ? "intense" : "default";
  }

  private spriteFacesForPose(
    defaultFacing: 1 | -1,
    poseFacing: Partial<Record<CharacterPose, 1 | -1>> | undefined,
    pose: CharacterPose,
  ): 1 | -1 {
    return poseFacing?.[pose] ?? defaultFacing;
  }

  private applyTint(sprite: Phaser.GameObjects.Image, tint?: number): void {
    if (tint) {
      sprite.setTint(tint);
      return;
    }

    sprite.clearTint();
  }
}
