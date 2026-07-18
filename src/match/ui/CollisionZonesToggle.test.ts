import assert from "node:assert/strict";
import test from "node:test";
import { CollisionZonesToggle } from "./CollisionZonesToggle";

class FakeElement {
  className = "";
  dataset: Record<string, string> = {};
  textContent = "";
  removed = false;
  readonly children: FakeElement[] = [];

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  remove(): void {
    this.removed = true;
  }
}

class FakeInputElement extends FakeElement {
  type = "";
  checked = false;
  readonly attributes = new Map<string, string>();
  private changeListener?: () => void;

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(eventName: string, listener: () => void): void {
    if (eventName === "change") {
      this.changeListener = listener;
    }
  }

  triggerChange(checked: boolean): void {
    this.checked = checked;
    this.changeListener?.();
  }
}

class FakeDocument {
  readonly existingToggle = new FakeElement();
  readonly body = new FakeElement();
  queriedSelector = "";
  createdInput?: FakeInputElement;

  querySelector(selector: string): FakeElement | null {
    this.queriedSelector = selector;
    return this.existingToggle;
  }

  createElement(tagName: string): FakeElement {
    if (tagName === "input") {
      this.createdInput = new FakeInputElement();
      return this.createdInput;
    }

    return new FakeElement();
  }
}

test("collision zones toggle mounts a checked checkbox and removes the old toggle", () => {
  const fakeDocument = new FakeDocument();
  const changes: boolean[] = [];
  const toggle = new CollisionZonesToggle({
    document: fakeDocument as unknown as Document,
    mountTarget: fakeDocument.body as unknown as HTMLElement,
    initialVisible: true,
    onChange: (visible) => changes.push(visible),
  });

  toggle.mount();
  fakeDocument.createdInput?.triggerChange(false);

  assert.equal(fakeDocument.queriedSelector, "[data-collision-zones-toggle]");
  assert.equal(fakeDocument.existingToggle.removed, true);
  assert.equal(fakeDocument.body.children.length, 1);
  assert.equal(fakeDocument.body.children[0]?.className, "collision-zones-toggle");
  assert.equal(fakeDocument.body.children[0]?.dataset.collisionZonesToggle, "true");
  assert.equal(fakeDocument.createdInput?.type, "checkbox");
  assert.equal(fakeDocument.createdInput?.checked, false);
  assert.equal(fakeDocument.createdInput?.attributes.get("aria-label"), "Show collision zones");
  assert.deepEqual(changes, [false]);
});

test("collision zones toggle updates the mounted checkbox state", () => {
  const fakeDocument = new FakeDocument();
  const toggle = new CollisionZonesToggle({
    document: fakeDocument as unknown as Document,
    mountTarget: fakeDocument.body as unknown as HTMLElement,
    initialVisible: false,
    onChange: () => undefined,
  });

  toggle.setVisible(true);
  toggle.mount();
  assert.equal(fakeDocument.createdInput?.checked, false);

  toggle.setVisible(true);

  assert.equal(fakeDocument.createdInput?.checked, true);
});
