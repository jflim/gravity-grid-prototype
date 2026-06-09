export interface ViewportSize {
  width: number;
  height: number;
}

export interface BrowserViewportSource {
  innerWidth?: number;
  innerHeight?: number;
  visualViewport?: {
    width?: number;
    height?: number;
  } | null;
}

export interface DocumentViewportSource {
  clientWidth?: number;
  clientHeight?: number;
}

export interface CommandPanelLayout {
  panelY: number;
  panelHeight: number;
  panelBottom: number;
  bottomMargin: number;
  safeAreaBottom: number;
  playfieldHeight: number;
  dockX: number;
  dockWidth: number;
}

export interface BattlefieldFrameInput {
  viewportWidth: number;
  playfieldHeight: number;
  worldWidth: number;
  aliveVehicleXs: number[];
}

export interface BattlefieldFrameLayout {
  centerX: number;
  centerY: number;
  targetWidth: number;
  targetHeight: number;
  zoom: number;
  visibleWorldWidth: number;
}

export interface ProjectileCameraInput {
  projectile: {
    x: number;
    y: number;
  };
  cameraCenter: {
    x: number;
    y: number;
  };
  visibleWorldWidth: number;
  visibleWorldHeight: number;
  marginRatio?: number;
}

const DOCK_MAX_WIDTH = 1720;
const DOCK_SIDE_MARGIN = 48;
const DOCK_SIDE_MARGIN_COMPACT = 18;
const WIDE_PANEL_HEIGHT = 164;
const COMPACT_PANEL_HEIGHT = 150;
const WIDE_BOTTOM_MARGIN = 40;
const COMPACT_BOTTOM_MARGIN = 28;
const CAMERA_TARGET_HEIGHT = 760;
const CAMERA_CENTER_Y = 470;
const CAMERA_WORLD_PADDING_X = 560;
const CAMERA_MIN_VISIBLE_WORLD_RATIO = 0.78;
const CAMERA_MIN_ZOOM = 0.34;
const CAMERA_MAX_ZOOM = 0.9;

export const DESIGN_VIEWPORT: ViewportSize = { width: 1600, height: 900 };
export const MIN_SUPPORTED_VIEWPORT: ViewportSize = { width: 1366, height: 768 };
export const MAX_PRESENTATION_VIEWPORT: ViewportSize = { width: 2400, height: 1350 };
export const GAMEPLAY_ASPECT_RATIO = 16 / 9;

export function shouldMountOnlineLobby(search: string): boolean {
  const params = new URLSearchParams(search);
  const value = params.get("onlinePanel");
  return value === "1" || value === "true";
}

export function shouldShowCombatHulls(search: string): boolean {
  const params = new URLSearchParams(search);
  const value = params.get("collisionZones") ?? params.get("combatHulls") ?? params.get("hulls");
  return value !== "0" && value !== "false" && value !== "off";
}

export function getGameViewportSize(
  browserViewport: BrowserViewportSource,
  documentViewport?: DocumentViewportSource,
): ViewportSize {
  return {
    width: Math.floor(smallestPositive(320, browserViewport.visualViewport?.width, documentViewport?.clientWidth, browserViewport.innerWidth)),
    height: Math.floor(
      smallestPositive(320, browserViewport.visualViewport?.height, documentViewport?.clientHeight, browserViewport.innerHeight),
    ),
  };
}

export function isSupportedGameViewport(viewport: ViewportSize): boolean {
  return viewport.width >= MIN_SUPPORTED_VIEWPORT.width && viewport.height >= MIN_SUPPORTED_VIEWPORT.height;
}

export function computeGameCanvasSize(viewport: ViewportSize): ViewportSize {
  return {
    width: Math.min(viewport.width, MAX_PRESENTATION_VIEWPORT.width),
    height: Math.min(viewport.height, MAX_PRESENTATION_VIEWPORT.height),
  };
}

export function readableWorldUiScale(cameraZoom: number): number {
  if (!Number.isFinite(cameraZoom) || cameraZoom <= 0) {
    return 1;
  }

  return clamp(1 / cameraZoom, 1, 2.4);
}

export function computeCommandPanelLayout(viewport: ViewportSize): CommandPanelLayout {
  const compactHeight = viewport.height < 760;
  const panelHeight = compactHeight ? COMPACT_PANEL_HEIGHT : WIDE_PANEL_HEIGHT;
  const bottomMargin = compactHeight ? COMPACT_BOTTOM_MARGIN : WIDE_BOTTOM_MARGIN;
  const panelY = Math.max(0, viewport.height - panelHeight - bottomMargin);
  const sideMargin = viewport.width < 900 ? DOCK_SIDE_MARGIN_COMPACT : DOCK_SIDE_MARGIN;
  const dockWidth = Math.min(DOCK_MAX_WIDTH, Math.max(320, viewport.width - sideMargin * 2));
  const dockX = Math.max(0, (viewport.width - dockWidth) / 2);

  return {
    panelY,
    panelHeight,
    panelBottom: panelY + panelHeight,
    bottomMargin,
    safeAreaBottom: panelY + panelHeight + bottomMargin,
    playfieldHeight: panelY,
    dockX,
    dockWidth,
  };
}

export function computeBattlefieldFrameLayout(input: BattlefieldFrameInput): BattlefieldFrameLayout {
  const minX = Math.min(...input.aliveVehicleXs, 0);
  const maxX = Math.max(...input.aliveVehicleXs, input.worldWidth);
  const targetWidth = Math.max(
    maxX - minX + CAMERA_WORLD_PADDING_X,
    input.worldWidth * CAMERA_MIN_VISIBLE_WORLD_RATIO,
  );
  const zoomX = input.viewportWidth / targetWidth;
  const zoomY = input.playfieldHeight / CAMERA_TARGET_HEIGHT;
  const zoom = clamp(Math.min(zoomX, zoomY), CAMERA_MIN_ZOOM, CAMERA_MAX_ZOOM);

  return {
    centerX: (minX + maxX) / 2,
    centerY: CAMERA_CENTER_Y,
    targetWidth,
    targetHeight: CAMERA_TARGET_HEIGHT,
    zoom,
    visibleWorldWidth: input.viewportWidth / zoom,
  };
}

export function shouldRecenterProjectileCamera(input: ProjectileCameraInput): boolean {
  if (input.visibleWorldWidth <= 0 || input.visibleWorldHeight <= 0) {
    return false;
  }

  const marginRatio = input.marginRatio ?? 0.08;
  const halfWidth = input.visibleWorldWidth / 2 + input.visibleWorldWidth * marginRatio;
  const halfHeight = input.visibleWorldHeight / 2 + input.visibleWorldHeight * marginRatio;
  const dx = Math.abs(input.projectile.x - input.cameraCenter.x);
  const dy = Math.abs(input.projectile.y - input.cameraCenter.y);

  return dx > halfWidth || dy > halfHeight;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smallestPositive(fallback: number, ...values: Array<number | null | undefined>): number {
  const candidates = values.filter(isPositiveNumber);
  return candidates.length > 0 ? Math.min(...candidates) : fallback;
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
