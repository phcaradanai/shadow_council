import type { WireRoomView } from "@shadow-council/protocol";
import { sounds } from "../presentation/sound.js";
import { renderRulesModal, attachRulesModalListeners } from "../components/RulesModal.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export interface LobbyCallbacks {
  onStartMatch: () => void;
  onLeaveRoom: () => void;
}

export const renderLobbyScreen = (
  container: HTMLElement,
  room: WireRoomView,
  viewerId: string,
  callbacks: LobbyCallbacks,
  errorMessage?: string,
  isSubmitting = false,
): void => {
  const isHost = room.hostPlayerId === viewerId;
  const connectedMembers = room.members.filter((m) => m.connected);
  const canStart = isHost && connectedMembers.length >= 2;
  const isMuted = sounds.isMuted();

  container.innerHTML = `
    <div class="screen screen--lobby">
      <header class="app-header">
        <div class="app-header__brand">
          <h1 class="app-title">LOBBY</h1>
          <p class="app-subtitle">Assembling the Shadow Council</p>
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

      <section class="card room-code-card">
        <div class="room-code-display">
          <span class="room-code-label">Room Code:</span>
          <strong class="room-code-value" id="room-code-text">${escapeHtml(room.roomCode)}</strong>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-copy-code" aria-label="Copy room code">
            📋 Copy Code
          </button>
        </div>
        <p class="room-code-hint">Share this code with other players (2–6 players supported). Need at least 2 players to begin.</p>
      </section>

      <section class="card roster-card">
        <h2 class="card__title">Connected Members (${connectedMembers.length} / 6)</h2>
        <div class="roster-grid">
          ${room.members
            .map((member) => {
              const isMemberHost = member.playerId === room.hostPlayerId;
              const isSelf = member.playerId === viewerId;
              return `
                <div class="roster-item ${isSelf ? "roster-item--self" : ""} ${!member.connected ? "roster-item--offline" : ""}">
                  <div class="roster-item__avatar">${isMemberHost ? "👑" : "👤"}</div>
                  <div class="roster-item__info">
                    <span class="roster-item__name">${escapeHtml(member.displayName)}</span>
                    <div class="roster-item__badges">
                      ${isSelf ? '<span class="badge badge--self">YOU</span>' : ""}
                      ${isMemberHost ? '<span class="badge badge--host">HOST</span>' : ""}
                      ${member.connected ? '<span class="badge badge--online">ONLINE</span>' : '<span class="badge badge--offline">OFFLINE</span>'}
                    </div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>

      <div class="lobby-actions">
        ${
          isHost
            ? `
              <button type="button" id="btn-start" class="btn btn--primary btn--large btn--block" ${!canStart || isSubmitting ? "disabled" : ""}>
                ${
                  !canStart
                    ? "Waiting for at least 2 connected players..."
                    : isSubmitting
                      ? "Starting Match..."
                      : "⚔️ Start Match"
                }
              </button>
            `
            : `
              <div class="waiting-box">
                <span class="waiting-spinner">⏳</span>
                <span>Waiting for the host to begin the match...</span>
              </div>
            `
        }
      </div>

      ${renderRulesModal()}
    </div>
  `;

  // Attach listeners
  attachRulesModalListeners(container);

  container.querySelector<HTMLButtonElement>("#btn-sound-toggle")?.addEventListener("click", () => {
    sounds.click();
    sounds.toggleMute();
    renderLobbyScreen(container, room, viewerId, callbacks, errorMessage, isSubmitting);
  });

  const copyBtn = container.querySelector<HTMLButtonElement>("#btn-copy-code");
  copyBtn?.addEventListener("click", () => {
    sounds.click();
    void navigator.clipboard.writeText(room.roomCode).then(() => {
      if (copyBtn) {
        copyBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          if (copyBtn) copyBtn.textContent = "📋 Copy Code";
        }, 2000);
      }
    });
  });

  container.querySelector<HTMLButtonElement>("#btn-start")?.addEventListener("click", () => {
    sounds.click();
    callbacks.onStartMatch();
  });

  container.querySelector<HTMLButtonElement>("#btn-leave-room")?.addEventListener("click", () => {
    sounds.click();
    callbacks.onLeaveRoom();
  });
};
