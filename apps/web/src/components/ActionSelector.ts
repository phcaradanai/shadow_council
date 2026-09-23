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
    <section class="action-panel decision-tray" aria-label="${t("action.title")}">
      <div class="decision-tray__header">
        <div>
          <span class="decision-tray__eyebrow">${t("action.turnEyebrow")}</span>
          <h3 class="action-panel__title">⚡ ${t("action.title")}</h3>
        </div>
        <span class="decision-tray__subtitle">${t("action.strikePlannerHint")}</span>
      </div>

      <div class="action-options action-options--game">
        <div class="action-card action-card--strike action-card--strike-planner" data-action="strike">
          <div class="action-card__header">
            <div class="action-card__badge-row">
              <span class="action-card__icon" aria-hidden="true">⚔️</span>
              <div>
                <h4>${t("action.strikeTitle")}</h4>
                <span class="strike-planner__subhead">${t("action.strikeBadge")}</span>
              </div>
            </div>
            <span class="strike-planner__power">⚡ ${t("action.powerAvailable", { power: currentPower })}</span>
          </div>

          <p class="action-card__desc">${t("action.strikeDesc")}</p>

          <form id="strike-form" class="strike-planner" data-current-power="${currentPower}">
            <section class="strike-step strike-step--target">
              <div class="strike-step__header">
                <span class="strike-step__number">01</span>
                <div>
                  <strong>${t("action.chooseTarget")}</strong>
                  <small>${t("action.targetHint")}</small>
                </div>
              </div>
              <select
                id="strike-target"
                name="targetId"
                class="form-select strike-target-select"
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
            </section>

            <section class="strike-step">
              <div class="strike-step__header">
                <span class="strike-step__number">02</span>
                <div>
                  <strong>${t("action.threatLabel")}</strong>
                  <small>${t("action.threatDesc")}</small>
                </div>
              </div>
              <div class="threat-seals" role="radiogroup" aria-label="${t("action.threatLabel")}">
                ${threats
                  .map(
                    (threat) => `
                      <label class="threat-seal">
                        <input
                          type="radio"
                          name="threat"
                          value="${threat}"
                          ${isSubmitting ? "disabled" : ""}
                        />
                        <span class="threat-seal__body">
                          <span class="threat-seal__icon">⚔</span>
                          <strong>${t("action.threatOption", { threat })}</strong>
                          <small>${t("action.claimPressure", { threat })}</small>
                        </span>
                      </label>
                    `,
                  )
                  .join("")}
              </div>
            </section>

            <section class="strike-step strike-step--secret">
              <div class="strike-step__header">
                <span class="strike-step__number">03</span>
                <div>
                  <strong>🔒 ${t("action.secretCommitment")}</strong>
                  <small>${t("action.forceDesc")}</small>
                </div>
              </div>
              <div class="force-stones" role="radiogroup" aria-label="${t("action.forceLabel")}">
                ${[0, 1, 2, 3]
                  .map((force) => {
                    const affordable = forces.includes(force as 0 | 1 | 2 | 3);
                    return `
                      <label class="force-stone ${!affordable ? "force-stone--unaffordable" : ""}">
                        <input
                          type="radio"
                          name="force"
                          value="${force}"
                          data-force="${force}"
                          data-affordable="${affordable ? "1" : "0"}"
                          ${!affordable || isSubmitting ? "disabled" : ""}
                        />
                        <span class="force-stone__body">
                          <span class="force-stone__icon">${force === 0 ? "🎭" : "◆"}</span>
                          <strong>${
                            force === 0 ? t("action.forceZero") : t("action.forceValue", { force })
                          }</strong>
                          <small>${t("action.forceCost", { force })}</small>
                        </span>
                      </label>
                    `;
                  })
                  .join("")}
              </div>
            </section>

            <aside class="strike-plan-summary" aria-live="polite">
              <div class="strike-plan-summary__header">
                <span>${t("action.planTitle")}</span>
                <strong id="strike-plan-style">${t("action.planAwaiting")}</strong>
              </div>
              <div class="strike-plan-summary__grid">
                <div>
                  <span>${t("action.planTarget")}</span>
                  <strong id="strike-plan-target">—</strong>
                </div>
                <div>
                  <span>${t("action.planClaim")}</span>
                  <strong id="strike-plan-threat">—</strong>
                </div>
                <div class="strike-plan-summary__secret">
                  <span>🔒 ${t("action.planSecret")}</span>
                  <strong id="strike-plan-force">—</strong>
                </div>
                <div>
                  <span>${t("action.planRemaining")}</span>
                  <strong id="strike-plan-power">${currentPower} ⚡</strong>
                </div>
              </div>
              <p id="strike-plan-read" class="strike-plan-read">${t("action.planHint")}</p>
            </aside>

            <button
              type="submit"
              id="btn-strike"
              class="btn btn--primary btn--large btn--strike strike-lock-btn"
              disabled
            >
              ${isSubmitting ? t("action.declaringStrike") : t("action.declareStrike")}
            </button>
          </form>
        </div>

        <div class="action-card action-card--scheme" data-action="scheme">
          <div>
            <div class="action-card__header">
              <div class="action-card__badge-row">
                <span class="action-card__icon" aria-hidden="true">♟️</span>
                <h4>${t("action.schemeTitle")}</h4>
              </div>
              <span class="action-card__badge">${t("action.schemeBadge")}</span>
            </div>
            <p class="action-card__desc">${t("action.schemeDesc")}</p>

            <div class="scheme-types">
              <label class="scheme-card">
                <input type="radio" name="schemeType" value="ambush" checked ${!canScheme || isSubmitting ? "disabled" : ""} />
                <span>
                  <strong>${t("action.schemeAmbushTitle")}</strong>
                  <small>${t("action.schemeAmbushDesc")}</small>
                </span>
              </label>
              <label class="scheme-card">
                <input type="radio" name="schemeType" value="bulwark" ${!canScheme || isSubmitting ? "disabled" : ""} />
                <span>
                  <strong>${t("action.schemeBulwarkTitle")}</strong>
                  <small>${t("action.schemeBulwarkDesc")}</small>
                </span>
              </label>
            </div>
          </div>

          <button
            type="button"
            id="btn-scheme"
            class="btn btn--large action-secondary-btn"
            ${!canScheme || isSubmitting ? "disabled" : ""}
          >
            ${
              !canScheme
                ? t("action.schemeBtnDisabled")
                : isSubmitting
                  ? t("action.schemingBtn")
                  : t("action.schemeBtn")
            }
          </button>
        </div>

        <div class="action-card action-card--recover ${!canRecover ? "action-card--disabled" : ""}" data-action="recover">
          <div>
            <div class="action-card__header">
              <div class="action-card__badge-row">
                <span class="action-card__icon" aria-hidden="true">⚡</span>
                <h4>${t("action.recoverTitle")}</h4>
              </div>
              <span class="action-card__badge">${t("action.recoverBadge")}</span>
            </div>
            <p class="action-card__desc">${t("action.recoverDesc")}</p>
            <div class="recover-meter" aria-hidden="true">
              ${[1, 2, 3]
                .map(
                  (point) =>
                    `<span class="${point <= currentPower ? "recover-meter__pip recover-meter__pip--filled" : "recover-meter__pip"}"></span>`,
                )
                .join("")}
            </div>
          </div>
          <button
            type="button"
            id="btn-recover"
            class="btn btn--large action-secondary-btn"
            ${!canRecover || isSubmitting ? "disabled" : ""}
          >
            ${
              !canRecover
                ? t("action.recoverBtnDisabled")
                : isSubmitting
                  ? t("action.recoveringBtn")
                  : t("action.recoverBtn")
            }
          </button>
        </div>
      </div>
    </section>
  `;
};
