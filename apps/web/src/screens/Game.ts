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
import { mountStatsDashboard } from "../components/StatsDashboard.js";
import { matchStatsTracker } from "../presentation/match-stats.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export interface GameCallbacks {
  onStrike: (targetId: string, threat: 1 | 2 | 3, force: 0 | 1 | 2 | 3) => void;
  onRecover: () => void;
  onScheme: (schemeType: "ambush" | "bulwark") => void;
  onReact: (choice: { type: "guard"; amount: 1 | 2 | 3 } | "challenge" | "yield") => void;
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
          <button type="button" class="btn btn--secondary btn--sm" id="btn-stats-open">
            📊 ${t("game.stats")}
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

      <!-- In-Game Stats Modal -->
      <div class="modal-backdrop" id="stats-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
        <div class="modal-dialog modal-dialog--lg">
          <header class="modal-header">
            <h2 class="modal-title" id="stats-modal-title">📊 ${t("game.stats")}</h2>
            <button type="button" class="modal-close" id="btn-stats-close" aria-label="Close">✕</button>
          </header>
          <div class="modal-body" id="game-stats-modal-container"></div>
        </div>
      </div>
    </div>
  `;

  attachRulesModalListeners(container);

  // Stats Modal Listeners
  const statsModal = container.querySelector<HTMLElement>("#stats-modal");
  const statsModalContainer = container.querySelector<HTMLElement>("#game-stats-modal-container");
  let unmountStats: (() => void) | undefined;

  container.querySelector<HTMLButtonElement>("#btn-stats-open")?.addEventListener("click", () => {
    sounds.click();
    if (statsModal) {
      statsModal.style.display = "flex";
      if (statsModalContainer) {
        unmountStats?.();
        unmountStats = mountStatsDashboard(
          statsModalContainer,
          matchStatsTracker.getSnapshots(),
          match.players,
          viewerId,
          undefined,
          true,
        );
      }
    }
  });

  const closeStats = () => {
    sounds.click();
    if (statsModal) {
      statsModal.style.display = "none";
      unmountStats?.();
      unmountStats = undefined;
    }
  };

  container.querySelector<HTMLButtonElement>("#btn-stats-close")?.addEventListener("click", closeStats);
  statsModal?.addEventListener("click", (e) => {
    if (e.target === statsModal) {
      closeStats();
    }
  });

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

  // Threat & Force radio buttons sounds
  container.querySelectorAll<HTMLInputElement>('input[name="threat"], input[name="force"]').forEach((radio) => {
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
      const canSubmit = Boolean(targetVal && !isSubmitting);
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
      const threatVal = Number(fd.get("threat") ?? 1);
      const forceVal = Number(fd.get("force") ?? 0);
      if (!targetId) return;
      const threat = (threatVal >= 1 && threatVal <= 3 ? threatVal : 1) as 1 | 2 | 3;
      const force = (forceVal >= 0 && forceVal <= 3 ? forceVal : 0) as 0 | 1 | 2 | 3;
      sounds.threat();
      callbacks.onStrike(targetId, threat, force);
    });
  }

  // Scheme click
  const schemeBtn = container.querySelector<HTMLButtonElement>("#btn-scheme");
  schemeBtn?.addEventListener("click", () => {
    if (isSubmitting) return;
    const selectedSchemeRadio = container.querySelector<HTMLInputElement>(
      'input[name="schemeType"]:checked',
    );
    const schemeType = (selectedSchemeRadio?.value === "bulwark" ? "bulwark" : "ambush") as
      | "ambush"
      | "bulwark";
    sounds.click();
    callbacks.onScheme(schemeType);
  });

  // Recover click
  const recoverBtn = container.querySelector<HTMLButtonElement>("#btn-recover");
  recoverBtn?.addEventListener("click", () => {
    if (isSubmitting) return;
    sounds.click();
    callbacks.onRecover();
  });

  // Reaction clicks
  container.querySelectorAll<HTMLButtonElement>(".btn-guard-amount").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isSubmitting) return;
      const amount = Number(btn.dataset.amount ?? 1) as 1 | 2 | 3;
      sounds.click();
      callbacks.onReact({ type: "guard", amount });
    });
  });

  container.querySelectorAll<HTMLButtonElement>(".reaction-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isSubmitting) return;
      const choice = btn.dataset.choice as "guard" | "challenge" | "yield" | undefined;
      if (choice === "guard") {
        const amount = Number(btn.dataset.amount ?? 1) as 1 | 2 | 3;
        sounds.click();
        callbacks.onReact({ type: "guard", amount });
      } else if (choice === "challenge") {
        sounds.challenge();
        callbacks.onReact("challenge");
      } else if (choice === "yield") {
        sounds.click();
        callbacks.onReact("yield");
      }
    });
  });

  // Start ticker
  const stopTicker = startCountdownTicker(container);
  return stopTicker;
};
