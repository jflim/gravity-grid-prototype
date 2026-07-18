import type { CombatVehicleSnapshot, RoomSnapshot } from "./onlineLobbySnapshot";
import { escapeHtml } from "./onlineLobbyMarkup";
import {
  activeVehicleFor,
  canFireActiveVehicle,
  canStartNextPreviewRound,
  gameplayPreviewBadge,
  localPlayerFor,
} from "./onlineGameplayPreviewView";

export function renderGameplayPreviewShell(): string {
  return `
    <section class="online-stage online-gameplay-stage">
      <main class="online-panel online-gameplay-panel" data-gameplay-preview-root></main>
    </section>
  `;
}

export function renderGameplayPreview(snapshot: RoomSnapshot, localSessionId: string): string {
  const activeVehicle = activeVehicleFor(snapshot);
  const localPlayer = localPlayerFor(snapshot, localSessionId);

  return `
    <div class="online-panel__header">
      <div>
        <p class="online-panel__eyebrow">Shared Playtest</p>
        <h1>Gravity Canyon</h1>
      </div>
      <span class="online-panel__badge" data-tone="ok">${escapeHtml(gameplayPreviewBadge(snapshot))}</span>
    </div>
    <div class="online-gameplay-summary">
      <span>Room <strong>${escapeHtml(snapshot.roomCode)}</strong></span>
      <span>${escapeHtml(snapshot.mode)}</span>
      <span>${escapeHtml(selectedMapLabel(snapshot))}</span>
      <span>First to ${snapshot.targetScore}</span>
      <span>Round ${snapshot.roundNumber}</span>
      <span>Turn ${snapshot.turnNumber}</span>
      <span>Time ${snapshot.turnSecondsRemaining}s</span>
      <span>Wind ${snapshot.wind}</span>
    </div>
    <section class="online-gameplay-active">
      <span>${escapeHtml(playerDisplayName(localPlayer?.displayName))}</span>
      <strong>${escapeHtml(activeDisplayName(activeVehicle?.displayName, snapshot.winnerTeam))}</strong>
      <em>${escapeHtml(snapshot.status)}</em>
    </section>
    ${renderLastShot(snapshot)}
    <div class="online-gameplay-vehicles" data-preview-vehicles>
      ${renderVehicleRows(snapshot.vehicles, snapshot.activeVehicleId)}
    </div>
    <div class="online-panel__actions online-gameplay-actions">
      <button type="button" data-preview-fire${disabledUnless(canFireActiveVehicle(snapshot, localSessionId))}>Fire Test Shot</button>
      <button type="button" data-next-preview-round${disabledUnless(canStartNextPreviewRound(snapshot, localSessionId))}>Next Round</button>
    </div>
  `;
}

function renderLastShot(snapshot: RoomSnapshot): string {
  if (!snapshot.lastShotId) {
    return "";
  }

  const shooter = vehicleDisplayName(snapshot.vehicles, snapshot.lastShotShooterVehicleId);
  const target = vehicleDisplayName(snapshot.vehicles, snapshot.lastShotTargetVehicleId);
  return `
    <section class="online-gameplay-shot" data-last-shot-id="${escapeHtml(snapshot.lastShotId)}">
      <span>Server Shot</span>
      <strong>${escapeHtml(shooter)} -> ${escapeHtml(target)}</strong>
      <em>Origin ${Math.round(snapshot.lastShotOriginX)}, ${Math.round(snapshot.lastShotOriginY)}</em>
      <em>Angle ${Math.round(snapshot.lastShotAngle)} | Power ${Math.round(snapshot.lastShotPower)}</em>
      <em>${escapeHtml(target)} HP ${snapshot.lastShotTargetHpBefore} -> ${snapshot.lastShotTargetHpAfter}</em>
    </section>
  `;
}

function renderVehicleRows(vehicles: readonly CombatVehicleSnapshot[], activeVehicleId: string): string {
  return vehicles.map((vehicle) => renderVehicleRow(vehicle, vehicle.vehicleId === activeVehicleId)).join("");
}

function renderVehicleRow(vehicle: CombatVehicleSnapshot, active: boolean): string {
  return `
    <article class="${escapeHtml(vehicleRowClass(vehicle, active))}">
      <div>
        <strong>${escapeHtml(vehicle.displayName)}</strong>
        <span>${escapeHtml(vehicle.className)}</span>
      </div>
      <meter min="0" max="${vehicle.maxHp}" value="${vehicle.hp}">${vehicleHpPercent(vehicle)}%</meter>
      <em>${escapeHtml(vehicleStatus(vehicle))}</em>
    </article>
  `;
}

function activeDisplayName(activeName: string | undefined, winnerTeam: string): string {
  if (activeName) {
    return activeName;
  }

  return winnerTeam ? `${capitalize(winnerTeam)} team` : "No winner";
}

function playerDisplayName(displayName: string | undefined): string {
  return displayName ?? "Guest";
}

function disabledUnless(enabled: boolean): string {
  return enabled ? "" : " disabled";
}

function selectedMapLabel(snapshot: RoomSnapshot): string {
  return snapshot.selectedMapName || snapshot.mapPick;
}

function vehicleDisplayName(vehicles: readonly CombatVehicleSnapshot[], vehicleId: string): string {
  return vehicles.find((vehicle) => vehicle.vehicleId === vehicleId)?.displayName || vehicleId || "Unknown";
}

function vehicleRowClass(vehicle: CombatVehicleSnapshot, active: boolean): string {
  return [
    "online-gameplay-vehicle",
    `online-gameplay-vehicle--${vehicle.team}`,
    active ? "online-gameplay-vehicle--active" : "",
    vehicle.alive ? "" : "online-gameplay-vehicle--defeated",
  ].filter(Boolean).join(" ");
}

function vehicleHpPercent(vehicle: CombatVehicleSnapshot): number {
  return vehicle.maxHp > 0 ? Math.round((vehicle.hp / vehicle.maxHp) * 100) : 0;
}

function vehicleStatus(vehicle: CombatVehicleSnapshot): string {
  return vehicle.alive ? `${vehicle.hp}/${vehicle.maxHp}` : "KO";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
