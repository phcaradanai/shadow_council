import type { WireMatchView, WireRoomView } from "@shadow-council/protocol";
import { sounds } from "../presentation/sound.js";
import { renderRulesModal, attachRulesModalListeners } from "../components/RulesModal.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export interface ResultCallbacks {
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export const renderResultScreen = (
  container: HTMLElement,
  room: WireRoomView,
  match: WireMatchView,
  viewerId: string,
  callbacks: ResultCallbacks,
  errorMessage?: string,
  isSubmitting = false,
): void => {
  const winnerId = match.phase.kind === "FINISHED" ? match.phase.winnerId : "";
  const isWinner = winnerId === viewerId;
  const isHost = room.hostPlayerId === viewerId;
  const isMuted = sounds.isMuted();

  const winner = match.players.find((p) => p.playerId === winnerId);
  const winnerName = winner?.displayName ?? "A Shadow Survivor";

  // Play sound on render if appropriate
  if (isWinner) {
    sounds.victory();
  }

  container.innerHTML = `
    <div class="screen screen--result">
      <header class="app-header">
        <div class="app-header__brand">
          <h1 class="app-title">SHADOW COUNCIL</h1>
          <p class="app-subtitle">Match Concluded · Final Decree</p>
        </div>
        <div class="app-header__actions">
          <button type="button" class="btn btn--icon" id="btn-sound-toggle" aria-label="${isMuted ? "Unmute sound" : "Mute sound"}">
            ${isMuted ? "🔇" : "🔊"}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-rules-open">
            📜 Rules
          </button>
          <button type="button" class="btn btn--danger btn--sm" id="btn-leave-room" ${isSubmitting ? "disabled" : ""}>
            Leave Room
          </button>
        </div>
      </header>

      ${errorMessage ? `<div class="alert alert--error" role="alert"><span class="alert__icon">⚠️</span> ${escapeHtml(errorMessage)}</div>` : ""}

      <section class="card result-banner ${isWinner ? "result-banner--victory" : ""}">
        <div class="result-trophy">${isWinner ? "🏆" : "👑"}</div>
        <h2 class="result-headline">${isWinner ? "VICTORY IS YOURS!" : `${escapeHtml(winnerName)} PREVAILS!`}</h2>
        <p class="result-subline">
          ${isWinner ? "You out-bluffed, survived every strike, and stand as the supreme authority." : `${escapeHtml(winnerName)} eliminated all rivals and claimed the throne of the Shadow Council.`}
        </p>
      </section>

      <section class="card result-roster-card">
        <h3 class="card__title">Final Council Standings</h3>
        <div class="result-roster">
          ${match.players
            .map((player) => {
              const won = player.playerId === winnerId;
              const self = player.playerId === viewerId;
              return `
                <div class="result-row ${won ? "result-row--winner" : "result-row--eliminated"}">
                  <div class="result-row__player">
                    <span class="result-row__rank">${won ? "👑 WINNER" : "☠️ ELIMINATED"}</span>
                    <strong class="result-row__name">${escapeHtml(player.displayName)}</strong>
                    ${self ? '<span class="badge badge--self">YOU</span>' : ""}
                  </div>
                  <div class="result-row__stats">
                    <span>Influence: <strong>${player.influence}/3</strong></span>
                    <span>Power: <strong>${player.power}/3</strong></span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>

      <div class="result-actions">
        ${
          isHost
            ? `
              <button type="button" id="btn-rematch" class="btn btn--primary btn--large btn--block" ${isSubmitting ? "disabled" : ""}>
                ${isSubmitting ? "Resetting to Lobby..." : "🔄 Play Again (Return to Lobby)"}
              </button>
            `
            : `
              <div class="waiting-box">
                <span class="waiting-spinner">⏳</span>
                <span>Waiting for host to initiate Play Again...</span>
              </div>
            `
        }
      </div>

      ${renderRulesModal()}
    </div>
  `;

  attachRulesModalListeners(container);

  container.querySelector<HTMLButtonElement>("#btn-sound-toggle")?.addEventListener("click", () => {
    sounds.click();
    sounds.toggleMute();
    renderResultScreen(container, room, match, viewerId, callbacks, errorMessage, isSubmitting);
  });

  container.querySelector<HTMLButtonElement>("#btn-rematch")?.addEventListener("click", () => {
    sounds.click();
    callbacks.onRematch();
  });

  container.querySelector<HTMLButtonElement>("#btn-leave-room")?.addEventListener("click", () => {
    sounds.click();
    callbacks.onLeaveRoom();
  });
};
