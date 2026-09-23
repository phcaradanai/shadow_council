import type { WireMatchView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

interface DefensePlan {
  readonly guard: 0 | 1 | 2 | 3;
  readonly challenge: boolean;
}

const planKey = (plan: DefensePlan): string => `${plan.guard}:${plan.challenge ? 1 : 0}`;

export const renderReactionControls = (
  match: WireMatchView,
  viewerId: string,
  isSubmitting: boolean,
): string => {
  if (match.phase.kind !== "REACTION" || match.phase.targetId !== viewerId) return "";

  const selfPlayer = match.players.find((player) => player.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const reactIntent = match.legalIntents.find((intent) => intent.type === "REACT");
  if (!reactIntent) return "";

  const legacyPlans: DefensePlan[] = [];
  for (const choice of reactIntent.choices) {
    if (choice === "yield") {
      legacyPlans.push({ guard: 0, challenge: false });
    } else if (choice === "challenge") {
      legacyPlans.push({ guard: 0, challenge: true });
    } else if (typeof choice === "object" && "type" in choice && choice.type === "guard") {
      legacyPlans.push({ guard: choice.amount, challenge: false });
    }
  }

  const plans = (
    reactIntent.defensePlans?.length ? reactIntent.defensePlans : legacyPlans
  ) as readonly DefensePlan[];
  const legalPlanKeys = plans.map(planKey).join(",");
  const guardAmounts = [...new Set(plans.map((plan) => plan.guard))].sort((a, b) => a - b);
  const currentThreat = match.phase.threat ?? 1;
  const ownPower = selfPlayer.power ?? 0;
  const forceValues = Array.from({ length: currentThreat + 1 }, (_, index) => index).join(" / ");
  const challengeCost = reactIntent.challengeCost ?? 1;

  return `
    <section
      class="reaction-panel defense-planner"
      aria-label="${t("reaction.title")}"
      data-legal-plans="${legalPlanKeys}"
      data-challenge-cost="${challengeCost}"
      data-threat="${currentThreat}"
      data-power="${ownPower}"
      data-influence="${selfPlayer.influence}"
      data-bulwark="${selfPlayer.activeScheme === "bulwark" ? "1" : "0"}"
    >
      <div class="defense-planner__threat">
        <span class="defense-planner__eyebrow">${t("reaction.incomingClaim")}</span>
        <strong class="defense-planner__threat-value">${t("reaction.threatIncoming", { threat: currentThreat })}</strong>
        <p>${t("reaction.hiddenForceRange", { values: forceValues })}</p>
      </div>

      <form id="defense-form" class="defense-planner__form">
        <div class="defense-planner__resource">
          <span>${t("reaction.powerAvailable")}</span>
          <strong>⚡ ${ownPower}</strong>
        </div>

        <fieldset class="defense-planner__section">
          <legend>🛡️ ${t("reaction.guardAmountLabel")}</legend>
          <p class="defense-planner__helper">${t("reaction.guardPlannerDesc")}</p>
          <div class="defense-guard-options" role="radiogroup" aria-label="${t("reaction.guardAmountLabel")}">
            ${guardAmounts
              .map(
                (amount) => `
                <label class="defense-choice ${amount === 0 ? "defense-choice--yield" : ""}">
                  <input
                    type="radio"
                    name="defenseGuard"
                    value="${amount}"
                    ${isSubmitting ? "disabled" : ""}
                  />
                  <span class="defense-choice__body">
                    <strong>${amount === 0 ? t("reaction.noGuard") : t("reaction.guardPoints", { amount })}</strong>
                    <small>${amount === 0 ? t("reaction.noGuardDesc") : t("reaction.guardPointsDesc", { amount })}</small>
                  </span>
                </label>
              `,
              )
              .join("")}
          </div>
        </fieldset>

        <fieldset class="defense-planner__section defense-planner__challenge">
          <legend>👁️ ${t("reaction.challengeTitle")}</legend>
          <label class="challenge-toggle">
            <input
              type="checkbox"
              id="defense-challenge"
              name="defenseChallenge"
              ${isSubmitting ? "disabled" : ""}
            />
            <span class="challenge-toggle__body">
              <strong>${t("reaction.challengePlannerTitle", { cost: challengeCost })}</strong>
              <small>${t("reaction.challengePlannerDesc", { threat: currentThreat })}</small>
            </span>
          </label>
        </fieldset>

        <div class="defense-plan-summary" aria-live="polite">
          <div class="defense-plan-summary__header">
            <span>${t("reaction.planTitle")}</span>
            <strong id="defense-plan-mode">${t("reaction.selectDefense")}</strong>
          </div>
          <div class="defense-plan-summary__cost">
            <span>${t("reaction.totalCost")}</span>
            <strong><span id="defense-plan-cost">0</span> / ${ownPower} ⚡</strong>
          </div>
          <div id="defense-plan-preview" class="defense-plan-preview">
            <p>${t("reaction.selectDefenseHint")}</p>
          </div>
        </div>

        <button
          type="submit"
          id="btn-lock-defense"
          class="btn btn--primary btn--large defense-lock-btn"
          disabled
        >
          ${isSubmitting ? t("reaction.lockingPlan") : t("reaction.lockPlan")}
        </button>
      </form>
    </section>
  `;
};
