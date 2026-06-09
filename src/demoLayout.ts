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

export interface RuntimeConfigSource {
  onlinePanel?: boolean;
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
  contentScale: number;
}

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CommandDeckElementLayout {
  scale: number;
  safePaddingBottom: number;
  portraitFrame: LayoutRect;
  portrait: LayoutRect;
  title: {
    x: number;
    y: number;
  };
  detail: {
    x: number;
    y: number;
  };
  event: {
    x: number;
    y: number;
  };
  moveMeter: LayoutRect;
  launchMeter: LayoutRect;
  aimPanel: LayoutRect;
  titleFontSize: number;
  detailFontSize: number;
  commandFontSize: number;
}

export interface BattlefieldFrameInput {
  viewportWidth: number;
  playfieldHeight: number;
  worldWidth: number;
  aliveVehicleXs: number[];
  frameBottomWorldY?: number;
}

export interface BattlefieldFrameLayout {
  centerX: number;
  centerY: number;
  targetWidth: number;
  targetHeight: number;
  zoom: number;
  visibleWorldWidth: number;
}

export interface CameraWorldBoundsInput {
  worldWidth: number;
  visibleWorldWidth: number;
}

export interface CameraWorldBounds {
  x: number;
  width: number;
  horizontalPadding: number;
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

export interface UnitWorldOverlayInput {
  useUnitConceptPreview: boolean;
  worldUiScale: number;
}

export interface UnitWorldOverlayLayout {
  classOffsetY: number;
  nameOffsetY: number;
  teamBarOffsetY: number;
  teamBarWidth: number;
  teamBarHeight: number;
  timerOffsetY: number;
  timerBadgeWidth: number;
  timerBadgeHeight: number;
  timerBadgeRadius: number;
  turnTagGapY: number;
}

export interface WindHudLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DOCK_MAX_WIDTH = 1720;
const DOCK_SIDE_MARGIN = 48;
const DOCK_SIDE_MARGIN_COMPACT = 18;
const COMMAND_DECK_BASE_HEIGHT = 180;
const WIDE_BOTTOM_MARGIN = 56;
const COMPACT_BOTTOM_MARGIN = 40;
const CAMERA_TARGET_HEIGHT = 760;
const CAMERA_CENTER_Y = 470;
const CAMERA_BOTTOM_SCREEN_GAP = 12;
const CAMERA_WORLD_PADDING_X = 560;
const CAMERA_MIN_VISIBLE_WORLD_RATIO = 0.78;
const CAMERA_MIN_ZOOM = 0.34;
const CAMERA_MAX_ZOOM = 0.9;

export const DESIGN_VIEWPORT: ViewportSize = { width: 1600, height: 900 };
export const MIN_SUPPORTED_VIEWPORT: ViewportSize = { width: 1366, height: 768 };
export const MAX_PRESENTATION_VIEWPORT: ViewportSize = { width: 2400, height: 1350 };
export const GAMEPLAY_ASPECT_RATIO = 16 / 9;

export function shouldMountOnlineLobby(search: string, runtimeConfig?: RuntimeConfigSource): boolean {
  const params = new URLSearchParams(search);
  const value = params.get("onlinePanel");
  if (value !== null) {
    return value === "1" || value === "true";
  }

  return runtimeConfig?.onlinePanel === true;
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

export function computeUnitWorldOverlayLayout(input: UnitWorldOverlayInput): UnitWorldOverlayLayout {
  const scale = Math.max(1, input.worldUiScale);
  const unitClearance = input.useUnitConceptPreview ? 136 : 112;

  return {
    classOffsetY: Math.round(unitClearance * scale),
    nameOffsetY: Math.round((unitClearance + 28) * scale),
    teamBarOffsetY: Math.round((unitClearance + 55) * scale),
    teamBarWidth: Math.round(96 * scale),
    teamBarHeight: Math.round(12 * scale),
    timerOffsetY: Math.round((unitClearance + 96) * scale),
    timerBadgeWidth: Math.round(112 * scale),
    timerBadgeHeight: Math.round(42 * scale),
    timerBadgeRadius: Math.round(10 * scale),
    turnTagGapY: Math.round(30 * scale),
  };
}

export function computeWindHudLayout(viewport: ViewportSize): WindHudLayout {
  return {
    x: Math.round(viewport.width / 2),
    y: 24,
    width: 244,
    height: 54,
  };
}

export function computeCommandPanelLayout(viewport: ViewportSize): CommandPanelLayout {
  const sideMargin = viewport.width < 900 ? DOCK_SIDE_MARGIN_COMPACT : DOCK_SIDE_MARGIN;
  const dockWidth = Math.min(DOCK_MAX_WIDTH, Math.max(320, viewport.width - sideMargin * 2));
  const compactHeight = viewport.height < 820;
  const contentScale = Math.min(1, dockWidth / DOCK_MAX_WIDTH);
  const panelHeight = Math.round(COMMAND_DECK_BASE_HEIGHT * contentScale);
  const bottomMargin = Math.round((compactHeight ? COMPACT_BOTTOM_MARGIN : WIDE_BOTTOM_MARGIN) * contentScale);
  const panelY = Math.max(0, viewport.height - panelHeight - bottomMargin);
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
    contentScale,
  };
}

export function computeCommandDeckElementLayout(panel: CommandPanelLayout): CommandDeckElementLayout {
  const scale = panel.contentScale;
  const scaled = (value: number): number => Math.round(value * scale);
  const scaledFont = (baseSize: number, minSize: number): number => Math.max(minSize, Math.round(baseSize * scale));
  const x = panel.dockX;
  const y = panel.panelY;
  const aimPanelWidth = scaled(198);
  const aimPanelHeight = scaled(128);
  const aimPanelX = x + panel.dockWidth - scaled(324);
  const launchX = x + Math.min(scaled(390), Math.max(scaled(286), panel.dockWidth * 0.31));
  const launchWidth = Math.min(scaled(960), Math.max(scaled(320), aimPanelX - launchX - scaled(28)));

  return {
    scale,
    safePaddingBottom: scaled(12),
    portraitFrame: {
      x: x + scaled(18),
      y: y + scaled(18),
      width: scaled(104),
      height: scaled(126),
    },
    portrait: {
      x: x + scaled(70),
      y: y + scaled(86),
      width: scaled(118),
      height: scaled(88),
    },
    title: {
      x: x + scaled(140),
      y: y + scaled(24),
    },
    detail: {
      x: x + scaled(140),
      y: y + scaled(54),
    },
    event: {
      x: x + scaled(140),
      y: y + scaled(92),
    },
    moveMeter: {
      x: x + scaled(140),
      y: y + scaled(126),
      width: scaled(218),
      height: scaled(42),
    },
    launchMeter: {
      x: launchX,
      y: y + scaled(42),
      width: launchWidth,
      height: scaled(76),
    },
    aimPanel: {
      x: aimPanelX,
      y: y + scaled(18),
      width: aimPanelWidth,
      height: aimPanelHeight,
    },
    titleFontSize: scaledFont(22, 15),
    detailFontSize: scaledFont(13, 10),
    commandFontSize: scaledFont(17, 12),
  };
}

export function computeCameraWorldBounds(input: CameraWorldBoundsInput): CameraWorldBounds {
  const overflowWidth = Math.max(0, input.visibleWorldWidth - input.worldWidth);
  const horizontalPadding = overflowWidth / 2;

  return {
    x: horizontalPadding === 0 ? 0 : -horizontalPadding,
    width: input.worldWidth + horizontalPadding * 2,
    horizontalPadding,
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
  const visibleWorldHeight = input.playfieldHeight / zoom;
  const centerY =
    typeof input.frameBottomWorldY === "number" && Number.isFinite(input.frameBottomWorldY)
      ? input.frameBottomWorldY - (input.playfieldHeight - CAMERA_BOTTOM_SCREEN_GAP) / zoom + visibleWorldHeight / 2
      : CAMERA_CENTER_Y;

  return {
    centerX: (minX + maxX) / 2,
    centerY,
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
