import type { WireMatchView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const stripLeadingGameIcon = (value: string): string =>
  value.replace(/^(?:⚔|♟|⚡|🛡)\uFE0F?\s*/u, "");

export const renderActionControls = (
  match: WireMatchView,
  viewerId: string,
  isSubmitting: boolean,
  selectedTargetId?: string,
): string => {
  if (match.phase.kind !== "ACTIVE_TURN" || match.phase.activePlayerId !== viewerId) return "";

  const selfPlayer = match.players.find((player) => player.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const strikeIntent = match.legalIntents.find((intent) => intent.type === "STRIKE");
  const recoverIntent = match.legalIntents.find((intent) => intent.type === "RECOVER");
  const schemeIntent = match.legalIntents.find((intent) => intent.type === "SCHEME");

  const canRecover = recoverIntent !== undefined;
  const canScheme = schemeIntent !== undefined;
  const targetIds = strikeIntent?.targetIds ?? [];
  const threats = strikeIntent?.threats ?? [1, 2, 3];
  const forces = strikeIntent?.forces ?? [0];
  const targets = match.players.filter((player) => targetIds.includes(player.playerId));
  const currentPower = selfPlayer.power ?? 0;

  return `
    <section class="action-panel decision-tray action-dock" aria-label="${t("action.title")}">
      <div class="action-dock__header">
        <strong>${t("game.turnYourTurn")}</strong>
        <span class="action-dock__power">
          <svg class="sc-icon" aria-hidden="true"><use href="#icon-power"/></svg>
          <span>${currentPower}</span>
        </span>
      </div>

      <div class="action-dock__main">
        <form id="strike-form" class="strike-console" data-current-power="${currentPower}">
          <div class="strike-console__target">
            <label class="sr-only" for="strike-target">${t("action.planTarget")}</label>
            <select
              id="strike-target"
              name="targetId"
              class="sr-only strike-target-select"
              required
              ${isSubmitting ? "disabled" : ""}
            >
              <option value="" disabled selected>${t("action.targetPlaceholder")}</option>
              ${targets
                .map(
                  (target) => `
                    <option
                      value="${escapeHtml(target.playerId)}"
                      data-name="${escapeHtml(target.displayName)}"
                      ${selectedTargetId === target.playerId ? "selected" : ""}
                    >
                      ${escapeHtml(target.displayName)} · ◆${target.influence}
                    </option>
                  `,
                )
                .join("")}
            </select>
            <div class="strike-target-prompt" id="strike-target-prompt" aria-live="polite">
              <span>${t("action.planTarget")}</span>
              <strong id="strike-plan-target">—</strong>
            </div>
          </div>

          <div class="strike-console__choices">
            <div class="strike-console__group">
              <span class="strike-console__label">${t("action.threatLabel")}</span>
              <div class="threat-tokens" role="radiogroup" aria-label="${t("action.threatLabel")}">
                ${threats
                  .map(
                    (threat) => `
                      <label class="threat-token">
                        <input
                          type="radio"
                          name="threat"
                          value="${threat}"
                          aria-label="${t("action.threatLabel")} ${threat}"
                          ${isSubmitting ? "disabled" : ""}
                        />
                        <span class="threat-token__body">
                          <svg class="sc-icon threat-token__icon" aria-hidden="true"><use href="#icon-threat"/></svg>
                          <strong>${threat}</strong>
                        </span>
                      </label>
                    `,
                  )
                  .join("")}
              </div>
            </div>

            <div class="strike-console__versus" aria-hidden="true">VS</div>

            <div class="strike-console__group strike-console__group--secret">
              <span class="strike-console__label">
                <svg class="sc-icon" aria-hidden="true"><use href="#icon-eye"/></svg>
                ${t("action.planSecret")}
              </span>
              <div class="force-tokens" role="radiogroup" aria-label="${t("action.forceLabel")}">
                ${[0, 1, 2, 3]
                  .map((force) => {
                    const affordable = forces.includes(force as 0 | 1 | 2 | 3);
                    return `
                      <label class="force-token ${!affordable ? "force-token--unaffordable" : ""}">
                        <input
                          type="radio"
                          name="force"
                          value="${force}"
                          data-force="${force}"
                          data-affordable="${affordable ? "1" : "0"}"
                          aria-label="${t("action.forceLabel")} ${force}"
                          ${!affordable || isSubmitting ? "disabled" : ""}
                        />
                        <span class="force-token__body">
                          <svg class="sc-icon force-token__icon" aria-hidden="true">
                            <use href="${force === 0 ? "#icon-eye" : "#icon-force"}"/>
                          </svg>
                          <strong>${force}</strong>
                        </span>
                      </label>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          </div>

          <div class="strike-console__footer">
            <div class="strike-verdict" aria-live="polite">
              <div class="strike-verdict__header">
                <strong id="strike-plan-style">${t("action.planAwaiting")}</strong>
                <span class="strike-verdict__power">
                  <span id="strike-plan-power">${currentPower}</span>
                </span>
              </div>
              <div class="strike-verdict__detail">
                <span>${t("action.planClaim")} <strong id="strike-plan-threat">—</strong></span>
                <span id="strike-plan-force" class="sr-only">—</span>
              </div>
              <p id="strike-plan-read" class="strike-plan-read">${t("action.planHint")}</p>
            </div>

            <button
              type="submit"
              id="btn-strike"
              class="commit-btn commit-btn--strike btn--strike strike-lock-btn"
              disabled
            >
              <svg class="sc-icon commit-btn__icon" aria-hidden="true"><use href="#icon-threat"/></svg>
              <span>${stripLeadingGameIcon(isSubmitting ? t("action.declaringStrike") : t("action.declareStrike"))}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="action-dock__secondary side-actions">
        <div class="side-action side-action--scheme" data-action="scheme">
          <svg class="sc-icon side-action__icon" aria-hidden="true"><use href="#icon-scheme"/></svg>
          <div class="side-action__body">
            <strong>${stripLeadingGameIcon(t("action.schemeTitle"))}</strong>
            <div class="scheme-types">
              <label class="scheme-card">
                <input type="radio" name="schemeType" value="ambush" checked ${!canScheme || isSubmitting ? "disabled" : ""} />
                <span>${t("action.schemeAmbushTitle")}</span>
              </label>
              <label class="scheme-card">
                <input type="radio" name="schemeType" value="bulwark" ${!canScheme || isSubmitting ? "disabled" : ""} />
                <span>
                  <svg class="sc-icon scheme-card__icon" aria-hidden="true"><use href="#icon-shield"/></svg>
                  ${stripLeadingGameIcon(t("action.schemeBulwarkTitle"))}
                </span>
              </label>
            </div>
          </div>
          <button type="button" id="btn-scheme" class="side-action__button" ${!canScheme || isSubmitting ? "disabled" : ""}>
            ${stripLeadingGameIcon(!canScheme ? t("action.schemeBtnDisabled") : t("action.schemeBtn"))}
          </button>
        </div>

        <div class="side-action side-action--recover ${!canRecover ? "side-action--disabled" : ""}" data-action="recover">
          <svg class="sc-icon side-action__icon" aria-hidden="true"><use href="#icon-recover"/></svg>
          <div class="side-action__body">
            <strong>${stripLeadingGameIcon(t("action.recoverTitle"))}</strong>
            <div class="recover-meter" aria-hidden="true">
              ${[1, 2, 3]
                .map(
                  (point) =>
                    `<span class="${point <= currentPower ? "recover-meter__pip recover-meter__pip--filled" : "recover-meter__pip"}"></span>`,
                )
                .join("")}
            </div>
          </div>
          <button type="button" id="btn-recover" class="side-action__button" ${!canRecover || isSubmitting ? "disabled" : ""}>
            ${stripLeadingGameIcon(!canRecover ? t("action.recoverBtnDisabled") : t("action.recoverBtn"))}
          </button>
        </div>
      </div>
    </section>
  `;
};
