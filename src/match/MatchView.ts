import type { CombatMarkerKind } from "../../shared/model/gameTypes.js";
import type { PlayableTerrain } from "../playableMaps";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";
import type { CombatMarkerRenderer } from "./rendering/CombatMarkerRenderer";
import type { EffectsRenderer } from "./rendering/EffectsRenderer";
import type { ProjectileRenderer } from "./rendering/ProjectileRenderer";
import type { TerrainRenderer } from "./rendering/TerrainRenderer";
import type { VehicleRenderer } from "./rendering/VehicleRenderer";
import type { CommandDeck } from "./ui/CommandDeck";
import type { CollisionZonesToggle } from "./ui/CollisionZonesToggle";

export interface MatchViewBaseState {
  vehicles: readonly VehicleState[];
  activeVehicle?: VehicleState;
  projectile?: ProjectileState;
  impactPreview?: ImpactPreview;
  currentMap?: PlayableTerrain;
  visibleVoidTopY: number;
  visibleVoidBottomY: number;
  terrainPlatformBottomY: number;
  terrainBreakthroughY: number;
  showCombatHulls: boolean;
  roundOver: boolean;
  turnCommitted: boolean;
  charging: boolean;
  charge: number;
  turnTime: number;
  localActiveTurn: boolean;
  cameraZoom: number;
  shotResult: string;
}

export interface MatchViewState extends MatchViewBaseState {
  roundComplete: boolean;
  windLabel: string;
}

export interface MatchViewBackground {
  create: () => void;
}

export interface MatchViewCollaborators {
  background: MatchViewBackground;
  terrainRenderer: Pick<TerrainRenderer, "draw">;
  effectsRenderer: Pick<EffectsRenderer, "drawAim" | "drawImpactPreview">;
  vehicleRenderer: Pick<VehicleRenderer, "draw">;
  projectileRenderer: Pick<ProjectileRenderer, "draw">;
  commandDeck: Pick<CommandDeck, "draw">;
  combatMarkerRenderer: Pick<CombatMarkerRenderer, "update" | "clear" | "addForVehicle">;
  collisionZonesToggle: Pick<CollisionZonesToggle, "mount" | "setVisible">;
}

export interface MatchViewOptions {
  collaborators: MatchViewCollaborators;
  worldWidth: number;
  terrainStep: number;
  surfaceAt: (x: number) => number;
  isMovable: (vehicle: VehicleState) => boolean;
}

export class MatchView {
  constructor(private readonly options: MatchViewOptions) {
    this.options.collaborators.collisionZonesToggle.mount();
  }

  createBackground(): void {
    this.options.collaborators.background.create();
  }

  update(deltaSeconds: number): void {
    this.options.collaborators.combatMarkerRenderer.update(deltaSeconds);
  }

  clearCombatMarkers(): void {
    this.options.collaborators.combatMarkerRenderer.clear();
  }

  addCombatMarkerForVehicle(vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot?: number): void {
    this.options.collaborators.combatMarkerRenderer.addForVehicle(vehicle, kind, label, slot);
  }

  setCollisionZonesVisible(visible: boolean): void {
    this.options.collaborators.collisionZonesToggle.setVisible(visible);
  }

  draw(state: MatchViewState): void {
    this.drawTerrain(state);
    this.drawAim(state);
    this.drawImpactPreview(state);
    this.drawVehicles(state);
    this.drawProjectile(state);
    this.drawHud(state);
  }

  private drawTerrain(state: MatchViewState): void {
    this.options.collaborators.terrainRenderer.draw({
      currentDemoMap: state.currentMap,
      worldWidth: this.options.worldWidth,
      terrainStep: this.options.terrainStep,
      visibleVoidTopY: state.visibleVoidTopY,
      visibleVoidBottomY: state.visibleVoidBottomY,
      terrainPlatformBottomY: state.terrainPlatformBottomY,
      terrainBreakthroughY: state.terrainBreakthroughY,
      surfaceAt: this.options.surfaceAt,
    });
  }

  private drawAim(state: MatchViewState): void {
    const active = state.activeVehicle;
    this.options.collaborators.effectsRenderer.drawAim({
      active,
      canAct: canDrawAim(state, active, this.options.isMovable),
    });
  }

  private drawImpactPreview(state: MatchViewState): void {
    this.options.collaborators.effectsRenderer.drawImpactPreview(state.impactPreview);
  }

  private drawVehicles(state: MatchViewState): void {
    this.options.collaborators.vehicleRenderer.draw({
      vehicles: state.vehicles,
      activeVehicle: state.activeVehicle,
      projectileActive: Boolean(state.projectile),
      roundOver: state.roundOver,
      turnCommitted: state.turnCommitted,
      showCombatHulls: state.showCombatHulls,
      charging: state.charging,
      turnTime: state.turnTime,
      localActiveTurn: state.localActiveTurn,
      cameraZoom: state.cameraZoom,
      isMovable: (vehicle) => this.options.isMovable(vehicle),
    });
  }

  private drawProjectile(state: MatchViewState): void {
    this.options.collaborators.projectileRenderer.draw(state.projectile);
  }

  private drawHud(state: MatchViewState): void {
    this.options.collaborators.commandDeck.draw({
      active: activeCommandDeckVehicle(state, this.options.isMovable),
      roundComplete: state.roundComplete,
      shotResult: state.shotResult,
      projectileInFlight: Boolean(state.projectile),
      charging: state.charging,
      charge: state.charge,
      windLabel: state.windLabel,
    });
  }
}

function canDrawAim(
  state: MatchViewState,
  active: VehicleState | undefined,
  isMovable: (vehicle: VehicleState) => boolean,
): boolean {
  if (!active) {
    return false;
  }

  return isVehicleActionOpen(state) && isMovable(active);
}

function activeCommandDeckVehicle(
  state: MatchViewState,
  isMovable: (vehicle: VehicleState) => boolean,
): VehicleState | undefined {
  const active = commandDeckCandidate(state);
  if (!active) {
    return undefined;
  }

  if (isCommandDeckLocked(state)) {
    return undefined;
  }

  return movableCommandDeckVehicle(active, isMovable);
}

function isVehicleActionOpen(state: MatchViewState): boolean {
  return !state.projectile && !state.roundOver && !state.turnCommitted;
}

function isCommandDeckLocked(state: MatchViewState): boolean {
  return state.roundComplete || state.turnCommitted;
}

function commandDeckCandidate(state: MatchViewState): VehicleState | undefined {
  return state.activeVehicle ?? state.vehicles[0];
}

function movableCommandDeckVehicle(
  vehicle: VehicleState,
  isMovable: (vehicle: VehicleState) => boolean,
): VehicleState | undefined {
  if (!isMovable(vehicle)) {
    return undefined;
  }

  return vehicle;
}
