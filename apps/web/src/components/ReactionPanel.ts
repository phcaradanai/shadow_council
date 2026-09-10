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
  const canGuard = choices.includes("guard");

  return `
    <section class="reaction-panel" aria-label="${t("reaction.title")}">
      <h3 class="reaction-panel__title">${t("reaction.title")}</h3>
      <p class="reaction-panel__hint">${t("reaction.hint")}</p>

      <div class="reaction-grid">
        <!-- Guard -->
        <div class="reaction-card ${!canGuard ? "reaction-card--disabled" : ""}" data-reaction="guard">
          <div class="reaction-card__icon">🛡️</div>
          <h4 class="reaction-card__name">${t("reaction.guardTitle")}</h4>
          <span class="reaction-card__cost">${t("reaction.guardCost")}</span>
          <p class="reaction-card__desc">${t("reaction.guardDesc")}</p>
          <button type="button" class="btn btn--guard reaction-btn" data-choice="guard" data-reaction="guard" ${!canGuard || isSubmitting ? "disabled" : ""}>
            ${!canGuard ? t("reaction.guardBtnDisabled") : isSubmitting ? t("reaction.guardBtnSubmitting") : t("reaction.guardBtn")}
          </button>
        </div>

        <!-- Challenge -->
        <div class="reaction-card reaction-card--challenge" data-reaction="challenge">
          <div class="reaction-card__icon">👁️</div>
          <h4 class="reaction-card__name">${t("reaction.challengeTitle")}</h4>
          <span class="reaction-card__cost">${t("reaction.challengeCost")}</span>
          <p class="reaction-card__desc">${t("reaction.challengeDesc")}</p>
          <button type="button" class="btn btn--challenge reaction-btn" data-choice="challenge" data-reaction="challenge" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? t("reaction.challengeBtnSubmitting") : t("reaction.challengeBtn")}
          </button>
        </div>

        <!-- Yield -->
        <div class="reaction-card reaction-card--yield" data-reaction="yield">
          <div class="reaction-card__icon">🏳️</div>
          <h4 class="reaction-card__name">${t("reaction.yieldTitle")}</h4>
          <span class="reaction-card__cost">${t("reaction.yieldCost")}</span>
          <p class="reaction-card__desc">${t("reaction.yieldDesc")}</p>
          <button type="button" class="btn btn--yield reaction-btn" data-choice="yield" data-reaction="yield" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? t("reaction.yieldBtnSubmitting") : t("reaction.yieldBtn")}
          </button>
        </div>
      </div>
    </section>
  `;
};
