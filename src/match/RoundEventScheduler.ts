export interface ScheduledRoundEvent {
  remove(invokeCallback?: boolean): void;
}

export interface RoundEventSchedulerOptions {
  schedule: (delayMs: number, action: () => void) => ScheduledRoundEvent;
}

export class RoundEventScheduler {
  private pending?: ScheduledRoundEvent;

  constructor(private readonly options: RoundEventSchedulerOptions) {}

  queue(delayMs: number, action: () => void): void {
    this.clear();
    this.pending = this.options.schedule(delayMs, () => {
      this.pending = undefined;
      action();
    });
  }

  clear(): void {
    this.pending?.remove(false);
    this.pending = undefined;
  }
}
