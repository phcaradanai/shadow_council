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
): string => {
  if (match.phase.kind !== "ACTIVE_TURN" || match.phase.activePlayerId !== viewerId) {
    return "";
  }

  const selfPlayer = match.players.find((p) => p.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const strikeIntent = match.legalIntents.find((i) => i.type === "STRIKE");
  const recoverIntent = match.legalIntents.find((i) => i.type === "RECOVER");
  const canRecover = recoverIntent !== undefined;
  const targetIds = strikeIntent?.targetIds ?? [];
  const fundingOptions = strikeIntent?.funding ?? [];
  const canFundGenuine = fundingOptions.includes(1);

  const targets = match.players.filter((p) => targetIds.includes(p.playerId));

  return `
    <section class="action-panel" aria-label="${t("action.title")}">
      <h3 class="action-panel__title">${t("action.title")}</h3>

      <div class="action-options">
        <!-- Strike Option Card -->
        <div class="action-card action-card--strike" data-action="strike">
          <div class="action-card__header">
            <h4>${t("action.strikeTitle")}</h4>
            <span class="action-card__badge">${t("action.strikeBadge")}</span>
          </div>
          <p class="action-card__desc">${t("action.strikeDesc")}</p>

          <form id="strike-form" class="action-form">
            <div class="form-group">
              <label for="strike-target" class="form-label">${t("action.chooseTarget")}</label>
              <select id="strike-target" name="targetId" class="form-select" required ${isSubmitting ? "disabled" : ""}>
                <option value="" disabled selected>${t("action.targetPlaceholder")}</option>
                ${targets
                  .map(
                    (tPlayer) =>
                      `<option value="${escapeHtml(tPlayer.playerId)}">${escapeHtml(tPlayer.displayName)} (◆${tPlayer.influence} ⚡${tPlayer.power})</option>`,
                  )
                  .join("")}
              </select>
            </div>

            <fieldset class="form-fieldset">
              <legend class="form-legend">${t("action.secretCommitment")}</legend>
              <div class="funding-options">
                <label class="radio-card">
                  <input type="radio" name="funding" value="0" ${isSubmitting ? "disabled" : ""} />
                  <div class="radio-card__content">
                    <span class="radio-card__title">${t("action.bluffTitle")}</span>
                    <span class="radio-card__desc">${t("action.bluffDesc")}</span>
                  </div>
                </label>

                <label class="radio-card ${!canFundGenuine ? "radio-card--disabled" : ""}">
                  <input type="radio" name="funding" value="1" ${!canFundGenuine ? "disabled" : ""} ${isSubmitting ? "disabled" : ""} />
                  <div class="radio-card__content">
                    <span class="radio-card__title">${t("action.genuineTitle")}</span>
                    <span class="radio-card__desc">${canFundGenuine ? t("action.genuineDesc") : t("action.genuineDisabled")}</span>
                  </div>
                </label>
              </div>
            </fieldset>

            <button type="submit" id="btn-strike" class="btn btn--primary btn--large" disabled>
              ${isSubmitting ? t("action.declaringStrike") : t("action.declareStrike")}
            </button>
          </form>
        </div>

        <!-- Recover Option Card -->
        <div class="action-card action-card--recover ${!canRecover ? "action-card--disabled" : ""}" data-action="recover">
          <div class="action-card__header">
            <h4>${t("action.recoverTitle")}</h4>
            <span class="action-card__badge">${t("action.recoverBadge")}</span>
          </div>
          <p class="action-card__desc">${t("action.recoverDesc")}</p>
          <div class="action-card__footer">
            <button type="button" id="btn-recover" class="btn btn--secondary btn--large" ${!canRecover || isSubmitting ? "disabled" : ""}>
              ${!canRecover ? t("action.recoverBtnDisabled") : isSubmitting ? t("action.recoveringBtn") : t("action.recoverBtn")}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
};
