export interface TurnControllerOptions {
  turnSeconds: number;
  windSource: () => number;
}

export type TurnTickResult = "active" | "timed-out";

export interface SetChargeStateInput {
  isCharging: boolean;
  charge: number;
}

export interface SyncServerTurnInput {
  activeVehicleId: string;
  turnSecondsRemaining: number;
  wind: number;
}

export class TurnController {
  private order: string[] = [];
  private index = 0;
  private time = 0;
  private currentWind = 0;
  private charging = false;
  private currentCharge = 0;
  private committed = false;

  constructor(private readonly options: TurnControllerOptions) {}

  get turnOrder(): readonly string[] {
    return this.order;
  }

  get turnIndex(): number {
    return this.index;
  }

  get activeTurnIndex(): number {
    return this.order.length > 0 ? this.index % this.order.length : 0;
  }

  get turnTime(): number {
    return this.time;
  }

  get wind(): number {
    return this.currentWind;
  }

  get isCharging(): boolean {
    return this.charging;
  }

  get charge(): number {
    return this.currentCharge;
  }

  get isCommitted(): boolean {
    return this.committed;
  }

  startRound(turnOrder: readonly string[]): void {
    this.order = [...turnOrder];
    this.index = 0;
    this.resetActionState();
    this.time = this.options.turnSeconds;
  }

  beginTurn(): void {
    this.time = this.options.turnSeconds;
    this.currentWind = this.options.windSource();
    this.resetActionState();
  }

  advanceTo(turnIndex: number): void {
    this.index = turnIndex;
    this.beginTurn();
  }

  syncFromServer(input: SyncServerTurnInput): boolean {
    const serverIndex = this.order.indexOf(input.activeVehicleId);
    const activeChanged = serverIndex >= 0 && serverIndex !== this.activeTurnIndex;
    if (activeChanged) {
      this.index = serverIndex;
      this.resetActionState();
    }

    this.time = Math.max(0, input.turnSecondsRemaining);
    this.currentWind = input.wind;
    return activeChanged;
  }

  tick(deltaSeconds: number): TurnTickResult {
    this.time = Math.max(0, this.time - deltaSeconds);
    return this.time <= 0 ? "timed-out" : "active";
  }

  setChargeState(input: SetChargeStateInput): void {
    this.charging = input.isCharging;
    this.currentCharge = input.charge;
  }

  resetActionState(): void {
    this.charging = false;
    this.currentCharge = 0;
    this.committed = false;
  }

  resetCharge(): void {
    this.charging = false;
    this.currentCharge = 0;
  }

  commitTurn(): void {
    this.resetCharge();
    this.committed = true;
  }

  endRound(): void {
    this.commitTurn();
  }
}
