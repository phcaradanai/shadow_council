import type { WireDomainEvent, WireMatchView, WireRoomView } from "@shadow-council/protocol";
import { sounds } from "../presentation/sound.js";
import { renderPlayerGrid } from "../components/PlayerPanel.js";
import { renderTurnIndicator } from "../components/TurnIndicator.js";
import { renderCountdown, startCountdownTicker } from "../components/Countdown.js";
import { renderActionControls } from "../components/ActionSelector.js";
import { renderReactionControls } from "../components/ReactionPanel.js";
import { renderEventLog } from "../components/EventLog.js";
import { renderRevealPanel } from "../components/RevealPanel.js";
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
const ICON_SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <symbol id="icon-influence" viewBox="0 0 24 24"><path d="M12 2 22 12 12 22 2 12 12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></symbol>
  <symbol id="icon-power" viewBox="0 0 24 24"><path d="m13 2-8 12h6l-1 8 9-13h-6l1-7Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></symbol>
  <symbol id="icon-threat" viewBox="0 0 24 24"><path d="m4 20 16-16M20 20 4 4M2 18l4 4m12-20 4 4M2 6l4-4m12 20 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></symbol>
  <symbol id="icon-force" viewBox="0 0 24 24"><path d="M5 6 7 9M12 2v5m7-1-2 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /><circle cx="12" cy="15" r="6" fill="currentColor" stroke="currentColor" stroke-width="2" /></symbol>
  <symbol id="icon-shield" viewBox="0 0 24 24"><path d="M12 3 20 6v6c0 4.5-3.1 7.2-8 9-4.9-1.8-8-4.5-8-9V6l8-3Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></symbol>
  <symbol id="icon-eye" viewBox="0 0 24 24"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="2" /></symbol>
  <symbol id="icon-scheme" viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="3" fill="none" stroke="currentColor" stroke-width="2" /><path d="M10 8.5c0 3-3.4 4.5-4 9h12c-.6-4.5-4-6-4-9M4 21h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></symbol>
  <symbol id="icon-recover" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 1 4M20 4v7h-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></symbol>
  <symbol id="icon-sound-on" viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4H4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></symbol>
  <symbol id="icon-sound-off" viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4H4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></symbol>
  <symbol id="icon-rules" viewBox="0 0 24 24"><path d="M3 5.5c3.4-1.8 6.4-1.4 9 .4 2.6-1.8 5.6-2.2 9-.4v13c-3.4-1.8-6.4-1.4-9 .4-2.6-1.8-5.6-2.2-9-.4v-13Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /><path d="M12 5.9v13" fill="none" stroke="currentColor" stroke-width="2" /></symbol>
  <symbol id="icon-stats" viewBox="0 0 24 24"><path d="M4 20V13h4v7m3 0V8h4v12m3 0V4h4v16M2 20h20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></symbol>
  <symbol id="icon-x" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></symbol>
  <symbol id="icon-crown" viewBox="0 0 24 24"><path d="m3 8 5 4 4-8 4 8 5-4-2 12H5L3 8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /><path d="M6 17h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></symbol>
</svg>`;

const svgIcon = (id: string, label?: string): string =>
  `<svg class="sc-icon" aria-hidden="${label ? "false" : "true"}"${label ? ` aria-label="${escapeHtml(label)}"` : ""} focusable="false"><use href="#${id}"/></svg>`;

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
  if (!document.getElementById("sc-icons")) {
    const div = document.createElement("div");
    div.id = "sc-icons";
    div.style.cssText = "display:none;position:absolute";
    div.innerHTML = ICON_SPRITE;
    document.body.prepend(div);
  }

  const isMuted = sounds.isMuted();
  const deadlineAt = match.phase.kind !== "FINISHED" ? match.phase.deadlineAt : undefined;
  const phase =
    match.phase.kind === "ACTIVE_TURN"
      ? "active_turn"
      : match.phase.kind === "REACTION"
        ? "reaction"
        : "finished";
  const connectionLabel =
    connectionStatus === "connected"
      ? t("game.connected")
      : connectionStatus === "connecting"
        ? t("game.reconnecting")
        : t("game.offline");
  const connectionClass =
    connectionStatus === "connected"
      ? ""
      : connectionStatus === "connecting"
        ? "chamber-conn--warning"
        : "chamber-conn--offline";

  container.innerHTML = `
    <div class="screen screen--game chamber" data-phase="${phase}" data-connection="${escapeHtml(connectionStatus)}">
      <div class="chamber-vfx game-vfx-layer" aria-hidden="true">
        <div class="chamber-vfx__ambient chamber-vfx__ambient--far"></div>
        <div class="chamber-vfx__ambient chamber-vfx__ambient--near"></div>
        <svg class="chamber-vfx__connections" preserveAspectRatio="none"></svg>
        <div class="chamber-vfx__vignette"></div>
      </div>

      <header class="chamber-utility app-header">
        <button type="button" class="util-btn" id="btn-sound-toggle" aria-label="${isMuted ? t("common.soundUnmute") : t("common.soundMute")}">
          ${isMuted ? svgIcon("icon-sound-off") : svgIcon("icon-sound-on")}
        </button>
        <button type="button" class="util-btn" id="btn-stats-open" aria-label="${t("game.stats")}" title="${t("game.stats")}">
          ${svgIcon("icon-stats")}
        </button>
        <button type="button" class="util-btn" id="btn-rules-open" aria-label="${t("common.rules")}" title="${t("common.rules")}">
          ${svgIcon("icon-rules")}
        </button>
        <span class="chamber-meta">
          <span class="meta-tag meta-tag--room">${t("game.room")} ${escapeHtml(room.roomCode)}</span>
          <span class="meta-tag meta-tag--round">${t("game.round")} ${match.round}</span>
        </span>
        <span class="chamber-conn ${connectionClass}" title="${escapeHtml(connectionLabel)}" role="status" aria-label="${escapeHtml(connectionLabel)}"></span>
        ${renderLanguageSwitcher(getLocale())}
        <button type="button" class="util-btn util-btn--leave" id="btn-leave-room" ${isSubmitting ? "disabled" : ""}>
          ${t("common.leave")}
        </button>
      </header>

      ${errorMessage ? `<div class="chamber-alert" role="alert">${escapeHtml(getLocalizedErrorMessage(errorMessage))}</div>` : ""}

      <main class="chamber-stage">
        ${renderPlayerGrid(match, viewerId)}
        ${renderRevealPanel(recentEvents, match.players)}
      </main>

      <aside class="self-deck" aria-label="${escapeHtml(phase === "reaction" ? t("reaction.title") : t("action.title"))}">
        ${renderTurnIndicator(match, viewerId)}
        ${renderCountdown(deadlineAt)}
        ${renderActionControls(match, viewerId, isSubmitting)}
        ${renderReactionControls(match, viewerId, isSubmitting)}
        ${renderEventLog(recentEvents, match.players)}
      </aside>

      ${renderRulesModal()}

      <div class="modal-backdrop" id="stats-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="stats-modal-title">
        <div class="modal-dialog modal-dialog--lg">
          <header class="modal-header">
            <h2 class="modal-title" id="stats-modal-title">${svgIcon("icon-stats")} ${t("game.stats")}</h2>
            <button type="button" class="modal-close" id="btn-stats-close" aria-label="Close">${svgIcon("icon-x")}</button>
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
    sounds.scheme();
    callbacks.onScheme(schemeType);
  });

  // Recover click
  const recoverBtn = container.querySelector<HTMLButtonElement>("#btn-recover");
  recoverBtn?.addEventListener("click", () => {
    if (isSubmitting) return;
    sounds.recover();
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
        container
          .querySelector<HTMLElement>(".chamber")
          ?.dispatchEvent(
            new CustomEvent("sc:defense-preview", { detail: { guard: 0, challenge: false } }),
          );
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
      container.querySelector<HTMLElement>(".chamber")?.dispatchEvent(
        new CustomEvent("sc:defense-preview", {
          detail: { guard: effectiveGuard, challenge: plan.challenge },
        }),
      );

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
      else if (plan.guard > 0) sounds.guard();
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
