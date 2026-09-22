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
import { t, getLocale, renderLanguageSwitcher, getLocalizedErrorMessage } from "../i18n/index.js";

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
          <h1 class="app-title">${t("common.title")}</h1>
          <div class="app-header__meta">
            <span class="meta-tag">${t("game.room")} <strong>${escapeHtml(room.roomCode)}</strong></span>
            <span class="meta-tag">${t("game.round")} <strong>${match.round}</strong></span>
            <span class="meta-tag meta-tag--conn ${connectionStatus !== "connected" ? "meta-tag--warning" : ""}">
              ${connectionStatus === "connected" ? t("game.connected") : connectionStatus === "connecting" ? t("game.reconnecting") : t("game.offline")}
            </span>
          </div>
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

      <!-- 3-Zone Council Chamber Layout -->
      <main class="game-main council-chamber">
        <!-- Zone 1: Situation & Verdict (Top) -->
        <section class="chamber-zone chamber-zone--situation" aria-label="Situation">
          ${renderTurnIndicator(match, viewerId)}
          ${renderCountdown(deadlineAt)}
          ${renderRevealPanel(recentEvents, match.players)}
        </section>

        <!-- Zone 2: Council Table Seats (Center) -->
        <section class="chamber-zone chamber-zone--table" aria-label="Council Table">
          ${renderPlayerGrid(match, viewerId)}
        </section>

        <!-- Zone 3: Decision Tray & Chronicle Drawer (Bottom) -->
        <section class="chamber-zone chamber-zone--decision decision-tray-zone" aria-label="Decision Tray">
          ${renderActionControls(match, viewerId, isSubmitting)}
          ${renderReactionControls(match, viewerId, isSubmitting)}
          ${renderEventLog(recentEvents, match.players)}
        </section>
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

  // Direct card-click targeting & synchronization
  const targetSelect = container.querySelector<HTMLSelectElement>("#strike-target");
  const targetableCards = container.querySelectorAll<HTMLElement>(
    ".player-card[data-targetable='true']",
  );

  const syncTargetHighlights = (selectedId?: string) => {
    targetableCards.forEach((c) => {
      const isSelected = Boolean(selectedId && c.dataset.playerId === selectedId);
      c.classList.toggle("player-card--selected-target", isSelected);
      if (isSelected) {
        c.setAttribute("aria-selected", "true");
      } else {
        c.removeAttribute("aria-selected");
      }
    });
  };

  targetableCards.forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.addEventListener("click", () => {
      const targetId = card.dataset.playerId;
      if (!targetId || !targetSelect) return;
      targetSelect.value = targetId;
      syncTargetHighlights(targetId);
      targetSelect.dispatchEvent(new Event("change", { bubbles: true }));
      sounds.click();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  if (targetSelect?.value) {
    syncTargetHighlights(targetSelect.value);
  }

  targetSelect?.addEventListener("change", () => {
    syncTargetHighlights(targetSelect.value);
  });

  // Funding stone clicks sound
  container.querySelectorAll<HTMLInputElement>('input[name="funding"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      sounds.click();
    });
  });

  // Strike form validation and submit
  const strikeForm = container.querySelector<HTMLFormElement>("#strike-form");
  if (strikeForm) {
    const updateStrikeButtonState = () => {
      const submitBtn = strikeForm.querySelector<HTMLButtonElement>("#btn-strike");
      if (!submitBtn) return;
      const targetVal = targetSelect?.value ?? "";
      const fundingRadio = strikeForm.querySelector<HTMLInputElement>(
        'input[name="funding"]:checked',
      );
      const canSubmit = Boolean(targetVal && fundingRadio && !isSubmitting);
      submitBtn.disabled = !canSubmit;
    };

    strikeForm.addEventListener("change", updateStrikeButtonState);
    strikeForm.addEventListener("input", updateStrikeButtonState);
    updateStrikeButtonState();

    strikeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (isSubmitting) return;
      const fd = new FormData(strikeForm);
      const targetId = String(fd.get("targetId") ?? "");
      const fundingVal = fd.get("funding");
      if (!targetId || fundingVal === null) return;
      const funding = Number(fundingVal) === 1 ? 1 : 0;
      sounds.threat();
      callbacks.onStrike(targetId, funding);
    });
  }

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
