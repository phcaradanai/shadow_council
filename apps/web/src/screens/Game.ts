import type { WireDomainEvent, WireMatchView, WireRoomView } from "@shadow-council/protocol";
import { sounds } from "../presentation/sound.js";
import { renderPlayerGrid } from "../components/PlayerPanel.js";
import { renderTurnIndicator } from "../components/TurnIndicator.js";
import { renderCountdown, startCountdownTicker } from "../components/Countdown.js";
import { renderActionControls } from "../components/ActionSelector.js";
import { renderReactionControls } from "../components/ReactionPanel.js";
import { renderRevealPanel } from "../components/RevealPanel.js";
import { renderEventLog } from "../components/EventLog.js";
import { renderRulesModal, attachRulesModalListeners } from "../components/RulesModal.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export interface GameCallbacks {
  onStrike: (targetId: string, funding: 0 | 1) => void;
  onRecover: () => void;
  onReact: (choice: "guard" | "challenge" | "yield") => void;
  onLeaveRoom: () => void;
}

export const renderGameScreen = (
  container: HTMLElement,
  room: WireRoomView,
  match: WireMatchView,
  viewerId: string,
  recentEvents: readonly WireDomainEvent[],
  callbacks: GameCallbacks,
  errorMessage?: string,
  isSubmitting = false,
  connectionStatus = "connected",
): (() => void) => {
  const isMuted = sounds.isMuted();
  const deadlineAt = match.phase.kind !== "FINISHED" ? match.phase.deadlineAt : undefined;

  container.innerHTML = `
    <div class="screen screen--game">
      <!-- Header -->
      <header class="app-header">
        <div class="app-header__brand">
          <h1 class="app-title">SHADOW COUNCIL</h1>
          <div class="app-header__meta">
            <span class="meta-tag">Room: <strong>${escapeHtml(room.roomCode)}</strong></span>
            <span class="meta-tag">Round <strong>${match.round}</strong></span>
            <span class="meta-tag meta-tag--conn ${connectionStatus !== "connected" ? "meta-tag--warning" : ""}">
              ${connectionStatus === "connected" ? "● Connected" : connectionStatus === "connecting" ? "◌ Reconnecting..." : "○ Offline"}
            </span>
          </div>
        </div>
        <div class="app-header__actions">
          <button type="button" class="btn btn--icon" id="btn-sound-toggle" aria-label="${isMuted ? "Unmute sound" : "Mute sound"}">
            ${isMuted ? "🔇" : "🔊"}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-rules-open">
            📜 Rules
          </button>
          <button type="button" class="btn btn--danger btn--sm" id="btn-leave-room" ${isSubmitting ? "disabled" : ""}>
            Leave
          </button>
        </div>
      </header>

      ${errorMessage ? `<div class="alert alert--error" role="alert"><span class="alert__icon">⚠️</span> ${escapeHtml(errorMessage)}</div>` : ""}

      <!-- Primary Decision & Status Area -->
      <main class="game-main">
        ${renderTurnIndicator(match, viewerId)}
        ${renderCountdown(deadlineAt)}
        ${renderRevealPanel(recentEvents, match.players)}
        ${renderActionControls(match, viewerId, isSubmitting)}
        ${renderReactionControls(match, viewerId, isSubmitting)}
        ${renderPlayerGrid(match, viewerId)}
        ${renderEventLog(recentEvents, match.players)}
      </main>

      ${renderRulesModal()}
    </div>
  `;

  attachRulesModalListeners(container);

  // Sound toggle
  container.querySelector<HTMLButtonElement>("#btn-sound-toggle")?.addEventListener("click", () => {
    sounds.click();
    sounds.toggleMute();
    renderGameScreen(
      container,
      room,
      match,
      viewerId,
      recentEvents,
      callbacks,
      errorMessage,
      isSubmitting,
      connectionStatus,
    );
  });

  // Leave room
  container.querySelector<HTMLButtonElement>("#btn-leave-room")?.addEventListener("click", () => {
    sounds.click();
    callbacks.onLeaveRoom();
  });

  // Strike form submit
  const strikeForm = container.querySelector<HTMLFormElement>("#strike-form");
  strikeForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const fd = new FormData(strikeForm);
    const targetId = String(fd.get("targetId") ?? "");
    const fundingVal = Number(fd.get("funding") ?? "0");
    const funding = fundingVal === 1 ? 1 : 0;
    if (targetId) {
      sounds.threat();
      callbacks.onStrike(targetId, funding);
    }
  });

  // Recover click
  const recoverBtn = container.querySelector<HTMLButtonElement>("#btn-recover");
  recoverBtn?.addEventListener("click", () => {
    if (isSubmitting) return;
    sounds.click();
    callbacks.onRecover();
  });

  // Reaction clicks
  container.querySelectorAll<HTMLButtonElement>(".reaction-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isSubmitting) return;
      const choice = btn.dataset.choice as "guard" | "challenge" | "yield" | undefined;
      if (choice) {
        if (choice === "challenge") sounds.challenge();
        else sounds.click();
        callbacks.onReact(choice);
      }
    });
  });

  // Start ticker
  const stopTicker = startCountdownTicker(container);
  return stopTicker;
};
