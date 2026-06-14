import Phaser from "phaser";
import {
  computeGameCanvasSize,
  getGameViewportSize,
  isSupportedGameViewport,
  MIN_SUPPORTED_VIEWPORT,
  shouldMountOnlineLobby,
} from "./demoLayout";
import { MatchScene } from "./match/MatchScene";
import { mountOnlineLobby } from "./onlineLobby";
import "./styles.css";

declare global {
  interface Window {
    __GRAVITY_CANYON_CONFIG__?: {
      onlinePanel?: boolean;
    };
  }
}

let currentViewportSupported = true;

const initialBrowserViewport = getGameViewportSize(window, document.documentElement);
const initialViewport = computeGameCanvasSize(initialBrowserViewport);
currentViewportSupported = isSupportedGameViewport(initialBrowserViewport);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#10131b",
  width: initialViewport.width,
  height: initialViewport.height,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: MatchScene,
};

const game = new Phaser.Game(config);
const viewportGuard = mountViewportGuard();
syncGameViewportSize();
window.addEventListener("resize", syncGameViewportSize);
window.visualViewport?.addEventListener("resize", syncGameViewportSize);
window.visualViewport?.addEventListener("scroll", syncGameViewportSize);

if (shouldMountOnlineLobby(window.location.search, window.__GRAVITY_CANYON_CONFIG__)) {
  mountOnlineLobby();
}

function syncGameViewportSize(): void {
  const browserViewport = getGameViewportSize(window, document.documentElement);
  const gameViewport = computeGameCanvasSize(browserViewport);
  currentViewportSupported = isSupportedGameViewport(browserViewport);
  document.documentElement.style.setProperty("--game-viewport-width", `${gameViewport.width}px`);
  document.documentElement.style.setProperty("--game-viewport-height", `${gameViewport.height}px`);
  game.scale.resize(gameViewport.width, gameViewport.height);
  updateViewportGuard(browserViewport);
}

function mountViewportGuard(): HTMLDivElement {
  const guard = document.createElement("div");
  guard.className = "viewport-guard";
  guard.hidden = true;

  const panel = document.createElement("div");
  panel.className = "viewport-guard__panel";

  const title = document.createElement("strong");
  title.textContent = "Resize window to play";

  const body = document.createElement("span");
  body.textContent = `Gravity Canyon v1 needs at least ${MIN_SUPPORTED_VIEWPORT.width} x ${MIN_SUPPORTED_VIEWPORT.height} visible browser pixels.`;

  const current = document.createElement("small");
  current.dataset.viewportGuardCurrent = "true";

  panel.append(title, body, current);
  guard.append(panel);
  document.body.append(guard);

  return guard;
}

function updateViewportGuard(viewport: { width: number; height: number }): void {
  viewportGuard.hidden = currentViewportSupported;
  const current = viewportGuard.querySelector<HTMLElement>("[data-viewport-guard-current]");
  if (current) {
    current.textContent = `Current: ${viewport.width} x ${viewport.height}`;
  }
}
