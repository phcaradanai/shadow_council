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
import { attachStrikePlanner } from "../presentation/strike-planner.js";
import { attachGameEffects } from "../presentation/game-effects.js";

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
  onReact: (plan: { guard: 0 | 1 | 2 | 3; challenge: boolean }) => void;
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
      <div class="game-vfx-layer" aria-hidden="true">
        <div class="game-vfx__ambient game-vfx__ambient--far"></div>
        <div class="game-vfx__ambient game-vfx__ambient--near"></div>
        <svg class="game-vfx__connections" preserveAspectRatio="none"></svg>
        <div class="game-vfx__vignette"></div>
      </div>
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
          <button type="button" class="btn btn--icon utility-action" id="btn-stats-open" aria-label="${t("game.stats")}" title="${t("game.stats")}">
            📊
          </button>
          <button type="button" class="btn btn--icon utility-action" id="btn-rules-open" aria-label="${t("common.rules")}" title="${t("common.rules")}">
            📜
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

  container
    .querySelector<HTMLButtonElement>("#btn-stats-close")
    ?.addEventListener("click", closeStats);
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

  attachStrikePlanner(container, isSubmitting, callbacks.onStrike);

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

  // Defense Planner: Guard and Challenge can be committed together.
  const defensePlanner = container.querySelector<HTMLElement>(".defense-planner");
  const defenseForm = container.querySelector<HTMLFormElement>("#defense-form");
  if (defensePlanner && defenseForm) {
    const legalPlans = new Set(
      (defensePlanner.dataset.legalPlans ?? "").split(",").filter(Boolean),
    );
    const challengeCost = Number(defensePlanner.dataset.challengeCost ?? "1");
    const ownPower = Number(defensePlanner.dataset.power ?? "0");
    const influence = Number(defensePlanner.dataset.influence ?? "0");
    const hasBulwark = defensePlanner.dataset.bulwark === "1";

    const selectedPlan = (): { guard: 0 | 1 | 2 | 3; challenge: boolean } | undefined => {
      const guardInput = defenseForm.querySelector<HTMLInputElement>(
        'input[name="defenseGuard"]:checked',
      );
      if (!guardInput) return undefined;
      const guard = Number(guardInput.value) as 0 | 1 | 2 | 3;
      const challenge =
        defenseForm.querySelector<HTMLInputElement>("#defense-challenge")?.checked ?? false;
      return { guard, challenge };
    };

    const updateDefensePlan = () => {
      const plan = selectedPlan();
      const submit = defenseForm.querySelector<HTMLButtonElement>("#btn-lock-defense");
      const mode = defenseForm.querySelector<HTMLElement>("#defense-plan-mode");
      const costEl = defenseForm.querySelector<HTMLElement>("#defense-plan-cost");
      const preview = defenseForm.querySelector<HTMLElement>("#defense-plan-preview");
      if (!submit || !mode || !costEl || !preview) return;

      if (!plan) {
        submit.disabled = true;
        mode.textContent = t("reaction.selectDefense");
        costEl.textContent = "0";
        preview.innerHTML = `<p>${t("reaction.selectDefenseHint")}</p>`;
        return;
      }

      const key = `${plan.guard}:${plan.challenge ? 1 : 0}`;
      const cost = plan.guard + (plan.challenge ? challengeCost : 0);
      const legal = legalPlans.has(key) && cost <= ownPower;
      const effectiveGuard = plan.guard + (hasBulwark && plan.guard > 0 ? 1 : 0);
      const failedChallengeDamage = Math.max(0, 2 - effectiveGuard);
      const remainingIfWrong = Math.max(0, influence - failedChallengeDamage);

      costEl.textContent = String(cost);
      submit.disabled = !legal || isSubmitting;

      if (plan.guard === 0 && !plan.challenge) {
        mode.textContent = t("reaction.modeYield");
        preview.innerHTML = `<p>${t("reaction.previewYield", { influence: Math.max(0, influence - 1) })}</p>`;
      } else if (plan.guard > 0 && !plan.challenge) {
        mode.textContent = t("reaction.modeGuard", { guard: plan.guard });
        preview.innerHTML = `<p>${t("reaction.previewGuard", { guard: effectiveGuard })}</p>`;
      } else if (plan.guard === 0) {
        mode.textContent = t("reaction.modeChallenge");
        preview.innerHTML = `
          <p class="preview-good">${t("reaction.previewBluffCaught")}</p>
          <p class="${remainingIfWrong === 0 ? "preview-lethal" : "preview-risk"}">
            ${t("reaction.previewChallengeWrong", { damage: failedChallengeDamage, influence: remainingIfWrong })}
          </p>
        `;
      } else {
        mode.textContent = t("reaction.modeHybrid", { guard: plan.guard });
        preview.innerHTML = `
          <p class="preview-good">${t("reaction.previewBluffCaught")}</p>
          <p class="${remainingIfWrong === 0 ? "preview-lethal" : "preview-risk"}">
            ${t("reaction.previewHybridWrong", {
              guard: effectiveGuard,
              damage: failedChallengeDamage,
              influence: remainingIfWrong,
            })}
          </p>
        `;
      }

      if (!legal) {
        preview.innerHTML += `<p class="preview-lethal">${t("reaction.planTooExpensive")}</p>`;
      }
    };

    defenseForm.addEventListener("change", () => {
      sounds.click();
      updateDefensePlan();
    });
    updateDefensePlan();

    defenseForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (isSubmitting) return;
      const plan = selectedPlan();
      if (!plan) return;
      const key = `${plan.guard}:${plan.challenge ? 1 : 0}`;
      if (!legalPlans.has(key)) return;
      if (plan.challenge) sounds.challenge();
      else sounds.click();
      callbacks.onReact(plan);
    });
  }

  // Start ticker and presentation effects.
  const stopTicker = startCountdownTicker(container);
  const stopEffects = attachGameEffects(container, match, viewerId, recentEvents);
  return () => {
    stopTicker();
    stopEffects();
  };
};
