import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import { MatchView, type MatchViewCollaborators, type MatchViewOptions, type MatchViewState } from "./MatchView";
import type { VehicleState } from "./MatchTypes";

type DrawCall = { name: string; input: unknown };

function vehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  const definition = DEMO_UNIT_DEFINITIONS[0]!;
  return {
    ...definition,
    x: 100,
    y: 200,
    hp: 100,
    alive: true,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    ...overrides,
  };
}

function state(overrides: Partial<MatchViewState> = {}): MatchViewState {
  const active = vehicle();
  return {
    vehicles: [active],
    activeVehicle: active,
    projectile: undefined,
    impactPreview: undefined,
    currentMap: undefined,
    visibleVoidTopY: 700,
    visibleVoidBottomY: 900,
    terrainPlatformBottomY: 700,
    terrainBreakthroughY: 690,
    showCombatHulls: true,
    roundOver: false,
    turnCommitted: false,
    charging: false,
    charge: 0,
    turnTime: 20,
    cameraZoom: 1,
    shotResult: "Ready.",
    roundComplete: false,
    windLabel: "calm",
    ...overrides,
  };
}

function collaborators(drawCalls: DrawCall[] = []): MatchViewCollaborators {
  return {
    background: {
      create: () => drawCalls.push({ name: "background:create", input: undefined }),
    },
    terrainRenderer: {
      draw: (input) => drawCalls.push({ name: "terrain", input }),
    },
    effectsRenderer: {
      drawAim: (input) => drawCalls.push({ name: "aim", input }),
      drawImpactPreview: (input) => drawCalls.push({ name: "impact", input }),
    },
    vehicleRenderer: {
      draw: (input) => drawCalls.push({ name: "vehicles", input }),
    },
    projectileRenderer: {
      draw: (input) => drawCalls.push({ name: "projectile", input }),
    },
    commandDeck: {
      draw: (input) => drawCalls.push({ name: "hud", input }),
    },
    combatMarkerRenderer: {
      update: (dt) => drawCalls.push({ name: "markers:update", input: dt }),
      clear: () => drawCalls.push({ name: "markers:clear", input: undefined }),
      addForVehicle: (target, kind, label, slot) =>
        drawCalls.push({ name: "markers:addForVehicle", input: { target, kind, label, slot } }),
    },
    collisionZonesToggle: {
      mount: () => drawCalls.push({ name: "toggle:mount", input: undefined }),
      setVisible: (visible) => drawCalls.push({ name: "toggle:setVisible", input: visible }),
    },
  };
}

function options(drawCalls: DrawCall[] = [], overrides: Partial<MatchViewOptions> = {}): MatchViewOptions {
  return {
    collaborators: collaborators(drawCalls),
    worldWidth: 2400,
    terrainStep: 6,
    surfaceAt: () => 500,
    isMovable: () => true,
    ...overrides,
  };
}

test("match view draws terrain, effects, vehicles, projectile, and hud from supplied state", () => {
  const drawCalls: DrawCall[] = [];
  const view = new MatchView(options(drawCalls));
  const input = state();
  drawCalls.length = 0;

  view.draw(input);

  assert.deepEqual(
    drawCalls.map((call) => call.name),
    ["terrain", "aim", "impact", "vehicles", "projectile", "hud"],
  );
  const terrainCall = drawCalls.find((call) => call.name === "terrain");
  assert.equal((terrainCall?.input as { worldWidth: number }).worldWidth, 2400);
  assert.equal((terrainCall?.input as { terrainStep: number }).terrainStep, 6);

  const aimCall = drawCalls.find((call) => call.name === "aim");
  assert.equal((aimCall?.input as { canAct: boolean }).canAct, true);

  const hudCall = drawCalls.find((call) => call.name === "hud");
  assert.equal((hudCall?.input as { active?: VehicleState }).active?.id, "red-1");
});

test("match view forwards marker lifecycle and collision-zone visibility", () => {
  const drawCalls: DrawCall[] = [];
  const view = new MatchView(options(drawCalls));
  const target = vehicle();
  drawCalls.length = 0;

  view.update(0.16);
  view.clearCombatMarkers();
  view.addCombatMarkerForVehicle(target, "direct", "-20", 1);
  view.setCollisionZonesVisible(false);

  assert.deepEqual(
    drawCalls.map((call) => call.name),
    ["markers:update", "markers:clear", "markers:addForVehicle", "toggle:setVisible"],
  );
});

test("match view hides active command deck state after round completion", () => {
  const drawCalls: DrawCall[] = [];
  const view = new MatchView(options(drawCalls));
  drawCalls.length = 0;

  view.draw(state({ roundComplete: true }));

  const hudCall = drawCalls.find((call) => call.name === "hud");
  assert.equal((hudCall?.input as { active?: VehicleState }).active, undefined);
});

test("match view delegates background creation to its collaborator", () => {
  const drawCalls: DrawCall[] = [];
  const view = new MatchView(options(drawCalls));
  drawCalls.length = 0;

  view.createBackground();

  assert.deepEqual(drawCalls, [{ name: "background:create", input: undefined }]);
});
