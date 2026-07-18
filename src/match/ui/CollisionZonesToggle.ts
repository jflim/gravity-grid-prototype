export interface CollisionZonesToggleOptions {
  document: Document;
  mountTarget: HTMLElement;
  initialVisible: boolean;
  onChange: (visible: boolean) => void;
}

export class CollisionZonesToggle {
  private input?: HTMLInputElement;

  constructor(private readonly options: CollisionZonesToggleOptions) {}

  mount(): void {
    this.options.document.querySelector("[data-collision-zones-toggle]")?.remove();

    const label = this.options.document.createElement("label");
    label.className = "collision-zones-toggle";
    label.dataset.collisionZonesToggle = "true";

    const input = this.options.document.createElement("input");
    input.type = "checkbox";
    input.checked = this.options.initialVisible;
    input.setAttribute("aria-label", "Show collision zones");

    const text = this.options.document.createElement("span");
    text.textContent = "Collision zones";

    input.addEventListener("change", () => {
      this.options.onChange(input.checked);
    });

    label.append(input, text);
    this.options.mountTarget.append(label);
    this.input = input;
  }

  setVisible(visible: boolean): void {
    if (this.input) {
      this.input.checked = visible;
    }
  }
}
