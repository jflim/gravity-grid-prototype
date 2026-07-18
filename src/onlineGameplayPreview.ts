import { getRoomSnapshot } from "./onlineLobbySnapshot";
import { renderGameplayPreview, renderGameplayPreviewShell } from "./onlineGameplayPreviewMarkup";
import type { OnlineGameplaySession } from "./onlineRoomTypes";

export type OnlineGameplayPreview = {
  remove: () => void;
};

export function mountOnlineGameplayPreview(
  session: OnlineGameplaySession,
  documentRef: Document = document,
): OnlineGameplayPreview {
  const stage = createGameplayPreviewStage(documentRef);
  const root = stage.querySelector<HTMLElement>("[data-gameplay-preview-root]");
  if (!root) {
    throw new Error("Online gameplay preview root did not render.");
  }
  const previewRoot = root;

  stage.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement) handlePreviewAction(session, target);
  });

  documentRef.body.appendChild(stage);
  render(session.initialSnapshot);

  session.room.onStateChange((state) => {
    render(getRoomSnapshot(state));
  });

  session.room.onLeave(() => {
    render({
      ...session.initialSnapshot,
      phase: "lobby",
      status: "Disconnected from room.",
      activeVehicleId: "",
      vehicles: [],
    });
  });

  return {
    remove: () => stage.remove(),
  };

  function render(snapshot = getRoomSnapshot(session.room.state)): void {
    previewRoot.innerHTML = renderGameplayPreview(snapshot, session.room.sessionId);
  }
}

function handlePreviewAction(session: OnlineGameplaySession, target: HTMLElement): void {
  if (target.dataset.previewFire !== undefined) session.room.send("previewFire");
  if (target.dataset.nextPreviewRound !== undefined) session.room.send("startNextRound");
  if (target.dataset.startRematch !== undefined) session.room.send("startRematch");
}

function createGameplayPreviewStage(documentRef: Document): HTMLElement {
  const template = documentRef.createElement("template");
  template.innerHTML = renderGameplayPreviewShell().trim();
  const stage = template.content.firstElementChild;
  if (!(stage instanceof HTMLElement)) {
    throw new Error("Online gameplay preview shell did not render.");
  }

  return stage;
}
