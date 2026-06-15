import assert from "node:assert/strict";
import test from "node:test";
import { RoundEventScheduler, type ScheduledRoundEvent } from "./RoundEventScheduler";

class FakeScheduledEvent implements ScheduledRoundEvent {
  removed = false;

  constructor(readonly action: () => void) {}

  remove(): void {
    this.removed = true;
  }

  trigger(): void {
    this.action();
  }
}

test("round event scheduler replaces an existing delayed event", () => {
  const scheduled: FakeScheduledEvent[] = [];
  const scheduler = new RoundEventScheduler({
    schedule: (_delayMs, action) => {
      const event = new FakeScheduledEvent(action);
      scheduled.push(event);
      return event;
    },
  });

  scheduler.queue(100, () => undefined);
  scheduler.queue(200, () => undefined);

  assert.equal(scheduled.length, 2);
  assert.equal(scheduled[0]?.removed, true);
  assert.equal(scheduled[1]?.removed, false);
});

test("round event scheduler clears pending events without running them", () => {
  const scheduled: FakeScheduledEvent[] = [];
  let ran = false;
  const scheduler = new RoundEventScheduler({
    schedule: (_delayMs, action) => {
      const event = new FakeScheduledEvent(action);
      scheduled.push(event);
      return event;
    },
  });

  scheduler.queue(100, () => {
    ran = true;
  });
  scheduler.clear();

  assert.equal(scheduled[0]?.removed, true);
  assert.equal(ran, false);
});

test("round event scheduler releases the pending handle when the delayed action runs", () => {
  let scheduled: FakeScheduledEvent | undefined;
  let ran = false;
  const scheduler = new RoundEventScheduler({
    schedule: (_delayMs, action) => {
      scheduled = new FakeScheduledEvent(action);
      return scheduled;
    },
  });

  scheduler.queue(100, () => {
    ran = true;
  });
  scheduled?.trigger();
  scheduler.clear();

  assert.equal(ran, true);
  assert.equal(scheduled?.removed, false);
});
