import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../../shared/content/v1Units.js";
import { scaleBattlefieldDisplay, scaleBattlefieldOffset } from "../../combatPresentation";
import type { VehicleState } from "../MatchTypes";
import { VehicleSpriteLayer } from "./VehicleSpriteLayer";

class FakeImage {
  x = 0;
  y = 0;
  key: string;
  width = 0;
  height = 0;
  angle = 0;
  flipX = false;

  constructor(x: number, y: number, key: string) {
    this.x = x;
    this.y = y;
    this.key = key;
  }

  setTexture(key: string): this {
    this.key = key;
    return this;
  }

  setOrigin(): this {
    return this;
  }

  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  setDisplaySize(width: number, height: number): this {
    this.width = width;
    this.height = height;
    return this;
  }

  setFlipX(flipX: boolean): this {
    this.flipX = flipX;
    return this;
  }

  setAlpha(): this {
    return this;
  }

  setAngle(angle: number): this {
    this.angle = angle;
    return this;
  }

  setDepth(): this {
    return this;
  }

  setTint(): this {
    return this;
  }

  clearTint(): this {
    return this;
  }
}

function vehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0]!,
    x: 500,
    y: 300,
    hp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

function createLayerHarness(useUnitConceptPreview = false) {
  const images: FakeImage[] = [];
  const scene = {
    add: {
      image: (x: number, y: number, key: string) => {
        const image = new FakeImage(x, y, key);
        images.push(image);
        return image;
      },
    },
  };

  return {
    images,
    layer: new VehicleSpriteLayer({
      scene: scene as never,
      useUnitConceptPreview,
    }),
  };
}

test("runtime unit sprites use battlefield scale and the same terrain angle as the vehicle", () => {
  const active = vehicle({
    characterOffsetX: 20,
    characterOffsetY: 28,
  });
  const { images, layer } = createLayerHarness(false);
  const expectedDisplay = scaleBattlefieldDisplay(active.characterDisplays.default);

  layer.draw({
    vehicle: active,
    active: false,
    charging: false,
    renderX: 500,
    renderY: 300,
    alpha: 1,
    slopeAngle: 12,
    koTilt: 0,
  });

  const characterSprite = images[1]!;
  assert.equal(characterSprite.width, expectedDisplay.width);
  assert.equal(characterSprite.height, expectedDisplay.height);
  assert.equal(characterSprite.x, 500 + scaleBattlefieldOffset(20));
  assert.equal(characterSprite.y, 300 + scaleBattlefieldOffset(28));
  assert.equal(characterSprite.angle, 12);
});

test("perlah default and intense runtime sprites use their authored left-facing orientation", () => {
  const perlah = DEMO_UNIT_DEFINITIONS.find((unit) => unit.characterId === "perlah");
  assert.ok(perlah, "Perlah unit definition exists");
  const { images, layer } = createLayerHarness(false);

  layer.draw({
    vehicle: vehicle({
      ...perlah,
      facing: 1,
    }),
    active: false,
    charging: false,
    renderX: 500,
    renderY: 300,
    alpha: 1,
    slopeAngle: 0,
    koTilt: 0,
  });

  assert.equal(images[1]!.flipX, true, "Perlah should flip her left-facing default art when facing right");

  layer.draw({
    vehicle: vehicle({
      ...perlah,
      facing: -1,
    }),
    active: true,
    charging: true,
    renderX: 500,
    renderY: 300,
    alpha: 1,
    slopeAngle: 0,
    koTilt: 0,
  });

  assert.equal(images[1]!.flipX, false, "Perlah should not flip her left-facing intense art when facing left");
});
