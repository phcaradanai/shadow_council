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
    <section class="action-panel decision-tray command-deck" aria-label="${t("action.title")}">
      <div class="command-deck__rail" aria-hidden="true">
        <span class="command-deck__pulse"></span>
        <strong>${t("game.turnYourTurn")}</strong>
        <span>⚡ ${currentPower}</span>
      </div>

      <div class="command-deck__primary">
        <form id="strike-form" class="strike-planner strike-console" data-current-power="${currentPower}">
          <div class="strike-console__target">
            <span class="strike-console__label">⌖ ${t("action.planTarget")}</span>
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
          </div>

          <div class="strike-console__choices">
            <div class="strike-console__group">
              <span class="strike-console__label">${t("action.threatLabel")}</span>
              <div class="threat-seals" role="radiogroup" aria-label="${t("action.threatLabel")}">
                ${threats
                  .map(
                    (threat) => `
                      <label class="threat-seal">
                        <input type="radio" name="threat" value="${threat}" ${isSubmitting ? "disabled" : ""} />
                        <span class="threat-seal__body">
                          <span class="threat-seal__icon">⚔</span>
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
              <span class="strike-console__label">🔒 ${t("action.planSecret")}</span>
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
            <div class="strike-plan-summary" aria-live="polite">
              <div class="strike-plan-summary__header">
                <strong id="strike-plan-style">${t("action.planAwaiting")}</strong>
              </div>
              <div class="strike-plan-summary__grid">
                <div><span>${t("action.planTarget")}</span><strong id="strike-plan-target">—</strong></div>
                <div><span>${t("action.planClaim")}</span><strong id="strike-plan-threat">—</strong></div>
                <div class="strike-plan-summary__secret"><span>🔒 ${t("action.planSecret")}</span><strong id="strike-plan-force">—</strong></div>
                <div><span>${t("action.planRemaining")}</span><strong id="strike-plan-power">${currentPower} ⚡</strong></div>
              </div>
              <p id="strike-plan-read" class="strike-plan-read">${t("action.planHint")}</p>
            </div>

            <button
              type="submit"
              id="btn-strike"
              class="btn btn--primary btn--large btn--strike strike-lock-btn"
              disabled
            >
              <span class="strike-lock-btn__icon">⚔</span>
              <span>${isSubmitting ? t("action.declaringStrike") : t("action.declareStrike")}</span>
            </button>
          </div>
        </form>
      </div>

      <div class="command-deck__secondary">
        <div class="quick-command quick-command--scheme" data-action="scheme">
          <div class="quick-command__icon">♟</div>
          <div class="quick-command__body">
            <strong>${t("action.schemeTitle")}</strong>
            <div class="scheme-types">
              <label class="scheme-card">
                <input type="radio" name="schemeType" value="ambush" checked ${!canScheme || isSubmitting ? "disabled" : ""} />
                <span>${t("action.schemeAmbushTitle")}</span>
              </label>
              <label class="scheme-card">
                <input type="radio" name="schemeType" value="bulwark" ${!canScheme || isSubmitting ? "disabled" : ""} />
                <span>${t("action.schemeBulwarkTitle")}</span>
              </label>
            </div>
          </div>
          <button type="button" id="btn-scheme" class="btn quick-command__button" ${!canScheme || isSubmitting ? "disabled" : ""}>
            ${!canScheme ? t("action.schemeBtnDisabled") : t("action.schemeBtn")}
          </button>
        </div>

        <div class="quick-command quick-command--recover ${!canRecover ? "action-card--disabled" : ""}" data-action="recover">
          <div class="quick-command__icon">⚡</div>
          <div class="quick-command__body">
            <strong>${t("action.recoverTitle")}</strong>
            <div class="recover-meter" aria-hidden="true">
              ${[1, 2, 3]
                .map(
                  (point) =>
                    `<span class="${point <= currentPower ? "recover-meter__pip recover-meter__pip--filled" : "recover-meter__pip"}"></span>`,
                )
                .join("")}
            </div>
          </div>
          <button type="button" id="btn-recover" class="btn quick-command__button" ${!canRecover || isSubmitting ? "disabled" : ""}>
            ${!canRecover ? t("action.recoverBtnDisabled") : t("action.recoverBtn")}
          </button>
        </div>
      </div>
    </section>
  `;
};
