import type { WireMatchView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderActionControls = (
  match: WireMatchView,
  viewerId: string,
  isSubmitting: boolean,
  selectedTargetId?: string,
): string => {
  if (match.phase.kind !== "ACTIVE_TURN" || match.phase.activePlayerId !== viewerId) {
    return "";
  }

  const selfPlayer = match.players.find((p) => p.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const strikeIntent = match.legalIntents.find((i) => i.type === "STRIKE");
  const recoverIntent = match.legalIntents.find((i) => i.type === "RECOVER");
  const schemeIntent = match.legalIntents.find((i) => i.type === "SCHEME");

  const canRecover = recoverIntent !== undefined;
  const canScheme = schemeIntent !== undefined;
  const targetIds = strikeIntent?.targetIds ?? [];
  const threats = strikeIntent?.threats ?? [1, 2, 3];
  const forces = strikeIntent?.forces ?? [0];

  const targets = match.players.filter((p) => targetIds.includes(p.playerId));
  const activeTarget = targets.find((t) => t.playerId === selectedTargetId);
  const currentPower = selfPlayer.power ?? 0;

  return `
    <section class="action-panel decision-tray" aria-label="${t("action.title")}">
      <div class="decision-tray__header">
        <h3 class="action-panel__title">⚡ ${t("action.title")}</h3>
        <span class="decision-tray__subtitle">${t("game.turnChooseActionDesc")}</span>
      </div>

      <div class="action-options grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Strike Option Card -->
        <div class="action-card action-card--strike" data-action="strike">
          <div class="action-card__header">
            <div class="action-card__badge-row">
              <span class="action-card__icon" aria-hidden="true">⚔️</span>
              <h4>${t("action.strikeTitle")}</h4>
            </div>
            <span class="action-card__badge">${t("action.strikeBadge")}</span>
          </div>
          <p class="action-card__desc">${t("action.strikeDesc")}</p>

          <form id="strike-form" class="action-form">
            <div class="form-group mb-3">
              <label for="strike-target" class="form-label block font-semibold text-sm mb-1">
                ${t("action.chooseTarget")}
                ${activeTarget ? `<strong class="form-label__highlight">(${activeTarget.displayName})</strong>` : ""}
              </label>
              <select id="strike-target" name="targetId" class="form-select w-full p-2 rounded bg-neutral-900 border border-neutral-700 text-neutral-200" required ${isSubmitting ? "disabled" : ""}>
                <option value="" disabled ${!selectedTargetId ? "selected" : ""}>${t("action.targetPlaceholder")}</option>
                ${targets
                  .map(
                    (tPlayer) =>
                      `<option value="${escapeHtml(tPlayer.playerId)}" ${selectedTargetId === tPlayer.playerId ? "selected" : ""}>${escapeHtml(tPlayer.displayName)} (◆${tPlayer.influence})</option>`,
                  )
                  .join("")}
              </select>
            </div>

            <!-- Threat Level (Public) -->
            <div class="form-group mb-3">
              <label class="form-label block font-semibold text-sm mb-1">
                ${t("action.threatLabel")}
              </label>
              <div class="grid grid-cols-3 gap-2">
                ${threats
                  .map(
                    (thr) => `
                  <label class="btn-option border border-amber-600/40 p-2 text-center rounded cursor-pointer hover:bg-amber-950/40 transition">
                    <input type="radio" name="threat" value="${thr}" class="sr-only" ${thr === 1 ? "checked" : ""} ${isSubmitting ? "disabled" : ""} />
                    <span class="block font-bold text-amber-300">⚔️ Threat ${thr}</span>
                    <span class="text-xs text-neutral-400 block">${thr} Dmg claim</span>
                  </label>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <!-- Force Commitment (Secret) -->
            <fieldset class="form-fieldset border border-neutral-800 p-3 rounded mb-3">
              <legend class="form-legend font-semibold text-sm text-neutral-300 px-1">${t("action.secretCommitment")}</legend>
              <p class="text-xs text-neutral-400 mb-2">${t("action.forceDesc")}</p>
              <div class="grid grid-cols-2 gap-2">
                ${[0, 1, 2, 3]
                  .map((fc) => {
                    const hasPower = fc <= currentPower;
                    return `
                  <label class="radio-card p-2 rounded border transition text-left cursor-pointer ${
                    hasPower
                      ? "border-neutral-700 hover:border-neutral-500 bg-neutral-950"
                      : "border-neutral-800 opacity-40 cursor-not-allowed bg-neutral-900"
                  }">
                    <input type="radio" name="force" value="${fc}" class="sr-only" ${fc === 0 ? "checked" : ""} ${!hasPower || isSubmitting ? "disabled" : ""} />
                    <div class="flex justify-between items-center">
                      <strong class="text-sm ${fc === 0 ? "text-purple-300" : "text-emerald-300"}">
                        ${fc === 0 ? "🎭 Bluff (0 Pw)" : `🗡️ Force ${fc} (${fc} Pw)`}
                      </strong>
                    </div>
                  </label>
                `;
                  })
                  .join("")}
              </div>
            </fieldset>

            <button type="submit" id="btn-strike" class="btn btn--primary btn--large btn--strike w-full py-2.5 rounded font-bold bg-amber-600 hover:bg-amber-500 text-neutral-950 transition" ${!selectedTargetId ? "disabled" : ""}>
              ${isSubmitting ? t("action.declaringStrike") : t("action.declareStrike")}
            </button>
          </form>
        </div>

        <!-- Scheme Option Card -->
        <div class="action-card action-card--scheme border border-indigo-900/50 bg-neutral-900/80 p-4 rounded-xl flex flex-col justify-between" data-action="scheme">
          <div>
            <div class="action-card__header flex justify-between items-center mb-2">
              <div class="action-card__badge-row flex items-center gap-2">
                <span class="action-card__icon" aria-hidden="true">♟️</span>
                <h4 class="font-bold text-neutral-100">${t("action.schemeTitle")}</h4>
              </div>
              <span class="action-card__badge bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded text-xs border border-indigo-700/50">${t("action.schemeBadge")}</span>
            </div>
            <p class="action-card__desc text-xs text-neutral-400 mb-3">${t("action.schemeDesc")}</p>

            <div class="scheme-types space-y-2 mb-4">
              <label class="scheme-card block p-2.5 rounded border border-neutral-700 hover:border-indigo-500 cursor-pointer bg-neutral-950/60 transition">
                <input type="radio" name="schemeType" value="ambush" class="mr-2 accent-indigo-500" checked ${!canScheme || isSubmitting ? "disabled" : ""} />
                <strong class="text-sm text-indigo-200">${t("action.schemeAmbushTitle")}</strong>
                <p class="text-xs text-neutral-400 mt-1">${t("action.schemeAmbushDesc")}</p>
              </label>
              <label class="scheme-card block p-2.5 rounded border border-neutral-700 hover:border-indigo-500 cursor-pointer bg-neutral-950/60 transition">
                <input type="radio" name="schemeType" value="bulwark" class="mr-2 accent-indigo-500" ${!canScheme || isSubmitting ? "disabled" : ""} />
                <strong class="text-sm text-indigo-200">${t("action.schemeBulwarkTitle")}</strong>
                <p class="text-xs text-neutral-400 mt-1">${t("action.schemeBulwarkDesc")}</p>
              </label>
            </div>
          </div>

          <button type="button" id="btn-scheme" class="btn btn--large w-full py-2.5 rounded font-semibold bg-indigo-700 hover:bg-indigo-600 text-white transition ${!canScheme ? "opacity-50 cursor-not-allowed" : ""}" ${!canScheme || isSubmitting ? "disabled" : ""}>
            ${!canScheme ? t("action.schemeBtnDisabled") : isSubmitting ? t("action.schemingBtn") : t("action.schemeBtn")}
          </button>
        </div>

        <!-- Recover Option Card -->
        <div class="action-card action-card--recover ${!canRecover ? "action-card--disabled opacity-50" : ""} border border-emerald-900/50 bg-neutral-900/80 p-4 rounded-xl flex flex-col justify-between" data-action="recover">
          <div>
            <div class="action-card__header flex justify-between items-center mb-2">
              <div class="action-card__badge-row flex items-center gap-2">
                <span class="action-card__icon" aria-hidden="true">⚡</span>
                <h4 class="font-bold text-neutral-100">${t("action.recoverTitle")}</h4>
              </div>
              <span class="action-card__badge bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded text-xs border border-emerald-700/50">${t("action.recoverBadge")}</span>
            </div>
            <p class="action-card__desc text-xs text-neutral-400 mb-3">${t("action.recoverDesc")}</p>
          </div>
          <div class="action-card__footer mt-auto">
            <button type="button" id="btn-recover" class="btn btn--secondary btn--large btn--recover w-full py-2.5 rounded font-semibold bg-emerald-700 hover:bg-emerald-600 text-white transition ${!canRecover ? "cursor-not-allowed" : ""}" ${!canRecover || isSubmitting ? "disabled" : ""}>
              ${!canRecover ? t("action.recoverBtnDisabled") : isSubmitting ? t("action.recoveringBtn") : t("action.recoverBtn")}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
};
