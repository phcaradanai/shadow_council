import type { WireRoomView } from "@shadow-council/protocol";
import { sounds } from "../presentation/sound.js";
import { renderRulesModal, attachRulesModalListeners } from "../components/RulesModal.js";
import { t, getLocale, renderLanguageSwitcher, getLocalizedErrorMessage } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export interface LobbyCallbacks {
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  onUpdateSettings?: (settings: { turnTimerEnabled: boolean; turnTimeSeconds?: number }) => void;
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
          <h1 class="app-title">${t("lobby.title")}</h1>
          <p class="app-subtitle">${t("lobby.subtitle")}</p>
        </div>
        <div class="app-header__actions">
          ${renderLanguageSwitcher(getLocale())}
          <button type="button" class="btn btn--icon" id="btn-sound-toggle" aria-label="${isMuted ? t("common.soundUnmute") : t("common.soundMute")}">
            ${isMuted ? "🔇" : "🔊"}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-rules-open">
            📜 ${t("common.rules")}
          </button>
          <button type="button" class="btn btn--danger btn--sm" id="btn-leave-room" ${isSubmitting ? "disabled" : ""}>
            ${t("common.leave")}
          </button>
        </div>
      </header>

      ${errorMessage ? `<div class="alert alert--error" role="alert"><span class="alert__icon">⚠️</span> ${escapeHtml(getLocalizedErrorMessage(errorMessage))}</div>` : ""}

      <section class="card room-code-card">
        <div class="room-code-display">
          <span class="room-code-label">${t("lobby.roomCodeLabel")}:</span>
          <strong class="room-code-value" id="room-code-text">${escapeHtml(room.roomCode)}</strong>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-copy-code" aria-label="${t("lobby.copyCode")}">
            📋 ${t("lobby.copyCode")}
          </button>
        </div>
        <p class="room-code-hint">${t("lobby.codeHint")}</p>
      </section>

      <section class="card settings-card" aria-label="${t("lobby.settingsTitle")}">
        <h2 class="card__title">⚙️ ${t("lobby.settingsTitle")}</h2>
        <div class="settings-grid">
          <div class="setting-item">
            <span class="setting-label">
              ${t("lobby.timerLabel")}
            </span>
            ${
              isHost
                ? `
                  <div class="setting-control">
                    <label class="toggle-switch" for="setting-timer-toggle">
                      <input type="checkbox" id="setting-timer-toggle" ${room.settings.turnTimerEnabled ? "checked" : ""} ${isSubmitting ? "disabled" : ""} />
                      <span class="toggle-slider"></span>
                    </label>
                    <span id="timer-status-text" class="setting-status">
                      ${room.settings.turnTimerEnabled ? t("lobby.timerEnabled") : t("lobby.timerDisabled")}
                    </span>
                  </div>
                `
                : `
                  <div class="setting-value">
                    <span class="badge ${room.settings.turnTimerEnabled ? "badge--active" : "badge--secondary"}">
                      ${room.settings.turnTimerEnabled ? t("lobby.timerEnabled") : t("lobby.timerDisabled")}
                    </span>
                  </div>
                `
            }
          </div>

          <div class="setting-item" id="duration-setting-row" style="${room.settings.turnTimerEnabled ? "" : "display: none;"}">
            <label class="setting-label" for="setting-duration-select">
              ${t("lobby.timerDuration")}
            </label>
            ${
              isHost
                ? `
                  <select id="setting-duration-select" class="form-select setting-select" ${isSubmitting ? "disabled" : ""}>
                    ${[30, 45, 60, 90]
                      .map(
                        (sec) =>
                          `<option value="${sec}" ${(room.settings.turnTimeSeconds ?? 45) === sec ? "selected" : ""}>${t("lobby.timerSeconds", { seconds: sec })}</option>`,
                      )
                      .join("")}
                  </select>
                `
                : `
                  <div class="setting-value">
                    <strong>${t("lobby.timerSeconds", { seconds: room.settings.turnTimeSeconds ?? 45 })}</strong>
                  </div>
                `
            }
          </div>
        </div>
        ${!isHost ? `<p class="settings-hint">${t("lobby.settingsHostOnly")}</p>` : ""}
      </section>

      <section class="card roster-card">
        <h2 class="card__title">${t("lobby.rosterTitle", { count: connectedMembers.length })}</h2>
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
                      ${isSelf ? `<span class="badge badge--self" data-badge="self">${t("common.you")}</span>` : ""}
                      ${isMemberHost ? `<span class="badge badge--host" data-badge="host">${t("common.host")}</span>` : ""}
                      ${member.connected ? `<span class="badge badge--online" data-badge="online">${t("common.online")}</span>` : `<span class="badge badge--offline" data-badge="offline">${t("common.offline")}</span>`}
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
                    ? t("lobby.waitingMinPlayers")
                    : isSubmitting
                      ? t("lobby.startingMatch")
                      : `⚔️ ${t("lobby.startMatch")}`
                }
              </button>
            `
            : `
              <div class="waiting-box">
                <span class="waiting-spinner">⏳</span>
                <span>${t("lobby.waitingHost")}</span>
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
        copyBtn.textContent = `✓ ${t("lobby.copiedCode")}`;
        setTimeout(() => {
          if (copyBtn) copyBtn.textContent = `📋 ${t("lobby.copyCode")}`;
        }, 2000);
      }
    });
  });

  const timerToggle = container.querySelector<HTMLInputElement>("#setting-timer-toggle");
  const durationSelect = container.querySelector<HTMLSelectElement>("#setting-duration-select");
  const durationRow = container.querySelector<HTMLElement>("#duration-setting-row");
  const timerStatusText = container.querySelector<HTMLElement>("#timer-status-text");

  timerToggle?.addEventListener("change", () => {
    sounds.click();
    const enabled = timerToggle.checked;
    if (durationRow) durationRow.style.display = enabled ? "" : "none";
    if (timerStatusText) {
      timerStatusText.textContent = enabled ? t("lobby.timerEnabled") : t("lobby.timerDisabled");
    }
    const duration = durationSelect
      ? Number(durationSelect.value)
      : (room.settings.turnTimeSeconds ?? 45);
    callbacks.onUpdateSettings?.({
      turnTimerEnabled: enabled,
      turnTimeSeconds: duration,
    });
  });

  durationSelect?.addEventListener("change", () => {
    sounds.click();
    const enabled = timerToggle ? timerToggle.checked : room.settings.turnTimerEnabled;
    const duration = Number(durationSelect.value);
    callbacks.onUpdateSettings?.({
      turnTimerEnabled: enabled,
      turnTimeSeconds: duration,
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
