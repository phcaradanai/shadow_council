import type { WireMatchView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

export const renderReactionControls = (
  match: WireMatchView,
  viewerId: string,
  isSubmitting: boolean,
): string => {
  if (match.phase.kind !== "REACTION" || match.phase.targetId !== viewerId) {
    return "";
  }

  const selfPlayer = match.players.find((p) => p.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const reactIntent = match.legalIntents.find((i) => i.type === "REACT");
  const choices = reactIntent?.choices ?? [];
  const guardChoices = choices.filter(
    (c) => typeof c === "object" && c.type === "guard",
  ) as { type: "guard"; amount: 1 | 2 | 3 }[];

  const canGuard = guardChoices.length > 0;
  const currentThreat = match.phase.threat ?? 1;

  return `
    <section class="reaction-panel decision-tray decision-tray--danger" aria-label="${t("reaction.title")}">
      <div class="decision-tray__header mb-4">
        <div class="flex justify-between items-center">
          <h3 class="reaction-panel__title text-lg font-bold text-red-300">🛡️ ${t("reaction.title")}</h3>
          <span class="bg-red-950 text-red-400 font-extrabold px-3 py-1 rounded border border-red-800 text-sm">
            ${t("reaction.threatIncoming", { threat: currentThreat })}
          </span>
        </div>
        <p class="reaction-panel__hint text-sm text-neutral-400 mt-1">${t("reaction.hint")}</p>
      </div>

      <div class="reaction-grid grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Guard -->
        <div class="reaction-card ${!canGuard ? "reaction-card--disabled opacity-50" : ""} border border-blue-900/60 bg-neutral-900/80 p-4 rounded-xl flex flex-col justify-between" data-reaction="guard">
          <div>
            <div class="reaction-card__top flex justify-between items-start mb-2">
              <div class="reaction-card__title-group">
                <h4 class="reaction-card__name font-bold text-blue-200">🛡️ ${t("reaction.guardTitle")}</h4>
                <span class="reaction-card__cost text-xs text-blue-400 font-mono">${t("reaction.guardCost")}</span>
              </div>
            </div>
            <p class="reaction-card__desc text-xs text-neutral-400 mb-3">${t("reaction.guardDesc")}</p>

            ${
              canGuard
                ? `
              <div class="guard-levels mb-3">
                <label class="block text-xs font-semibold text-neutral-300 mb-1">${t("reaction.guardAmountLabel")}</label>
                <div class="grid grid-cols-3 gap-1">
                  ${guardChoices
                    .map(
                      (g) => `
                    <button
                      type="button"
                      class="btn-guard-amount py-1 px-2 text-xs rounded border border-blue-700 bg-blue-950/60 text-blue-200 hover:bg-blue-800 transition font-bold"
                      data-choice="guard"
                      data-amount="${g.amount}"
                      ${isSubmitting ? "disabled" : ""}
                    >
                      🛡️ ${g.amount} Pw
                    </button>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `
                : `
              <p class="text-xs text-neutral-500 italic mb-3">${t("reaction.guardBtnDisabled")}</p>
            `
            }
          </div>

          <button
            type="button"
            class="btn btn--guard reaction-btn w-full py-2.5 rounded font-semibold bg-blue-700 hover:bg-blue-600 text-white transition ${!canGuard ? "cursor-not-allowed" : ""}"
            data-choice="guard"
            data-amount="${guardChoices.length > 0 ? guardChoices[guardChoices.length - 1]!.amount : 1}"
            ${!canGuard || isSubmitting ? "disabled" : ""}
          >
            ${!canGuard ? t("reaction.guardBtnDisabled") : isSubmitting ? t("reaction.guardBtnSubmitting") : `${t("reaction.guardBtn")} (Max)`}
          </button>
        </div>

        <!-- Challenge -->
        <div class="reaction-card reaction-card--challenge border border-purple-900/60 bg-neutral-900/80 p-4 rounded-xl flex flex-col justify-between" data-reaction="challenge">
          <div>
            <div class="reaction-card__top flex justify-between items-start mb-2">
              <div class="reaction-card__title-group">
                <h4 class="reaction-card__name font-bold text-purple-200">👁️ ${t("reaction.challengeTitle")}</h4>
                <span class="reaction-card__cost text-xs text-purple-400 font-mono">${t("reaction.challengeCost")}</span>
              </div>
            </div>
            <p class="reaction-card__desc text-xs text-neutral-400 mb-3">${t("reaction.challengeDesc")}</p>
          </div>
          <button
            type="button"
            class="btn btn--challenge reaction-btn w-full py-2.5 rounded font-semibold bg-purple-700 hover:bg-purple-600 text-white transition"
            data-choice="challenge"
            ${isSubmitting ? "disabled" : ""}
          >
            ${isSubmitting ? t("reaction.challengeBtnSubmitting") : t("reaction.challengeBtn")}
          </button>
        </div>

        <!-- Yield -->
        <div class="reaction-card reaction-card--yield border border-neutral-700 bg-neutral-900/80 p-4 rounded-xl flex flex-col justify-between" data-reaction="yield">
          <div>
            <div class="reaction-card__top flex justify-between items-start mb-2">
              <div class="reaction-card__title-group">
                <h4 class="reaction-card__name font-bold text-neutral-200">🏳️ ${t("reaction.yieldTitle")}</h4>
                <span class="reaction-card__cost text-xs text-neutral-400 font-mono">${t("reaction.yieldCost")}</span>
              </div>
            </div>
            <p class="reaction-card__desc text-xs text-neutral-400 mb-3">${t("reaction.yieldDesc")}</p>
          </div>
          <button
            type="button"
            class="btn btn--yield reaction-btn w-full py-2.5 rounded font-semibold bg-neutral-700 hover:bg-neutral-600 text-white transition"
            data-choice="yield"
            ${isSubmitting ? "disabled" : ""}
          >
            ${isSubmitting ? t("reaction.yieldBtnSubmitting") : t("reaction.yieldBtn")}
          </button>
        </div>
      </div>
    </section>
  `;
};
