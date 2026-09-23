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
    if (choice === "yield") legacyPlans.push({ guard: 0, challenge: false });
    else if (choice === "challenge") legacyPlans.push({ guard: 0, challenge: true });
    else if (typeof choice === "object" && "type" in choice && choice.type === "guard") {
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
  const challengeCost = reactIntent.challengeCost ?? 1;

  return `
    <section
      class="reaction-panel defense-planner reaction-console"
      aria-label="${t("reaction.title")}"
      data-legal-plans="${legalPlanKeys}"
      data-challenge-cost="${challengeCost}"
      data-threat="${currentThreat}"
      data-power="${ownPower}"
      data-influence="${selfPlayer.influence}"
      data-bulwark="${selfPlayer.activeScheme === "bulwark" ? "1" : "0"}"
    >
      <div class="reaction-console__incoming">
        <span class="reaction-console__warning">${t("reaction.incomingClaim")}</span>
        <div class="reaction-console__threat-orb">
          <span>⚔</span>
          <strong>${currentThreat}</strong>
        </div>
        <small>⚡ ${ownPower}</small>
      </div>

      <form id="defense-form" class="defense-planner__form reaction-console__form">
        <div class="reaction-console__guard">
          <span class="reaction-console__label">🛡 ${t("reaction.guardAmountLabel")}</span>
          <div class="defense-guard-options" role="radiogroup" aria-label="${t("reaction.guardAmountLabel")}">
            ${guardAmounts
              .map(
                (amount) => `
                  <label class="defense-choice ${amount === 0 ? "defense-choice--yield" : ""}">
                    <input type="radio" name="defenseGuard" value="${amount}" ${isSubmitting ? "disabled" : ""} />
                    <span class="defense-choice__body">
                      <strong>${amount}</strong>
                      <small>${amount === 0 ? t("reaction.noGuard") : "Guard"}</small>
                    </span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </div>

        <label class="challenge-toggle reaction-console__challenge">
          <input
            type="checkbox"
            id="defense-challenge"
            name="defenseChallenge"
            ${isSubmitting ? "disabled" : ""}
          />
          <span class="challenge-toggle__body">
            <span class="challenge-toggle__eye">👁</span>
            <strong>${t("reaction.challengeTitle")}</strong>
            <small>-${challengeCost} ⚡</small>
          </span>
        </label>

        <div class="defense-plan-summary reaction-console__summary" aria-live="polite">
          <div class="defense-plan-summary__header">
            <strong id="defense-plan-mode">${t("reaction.selectDefense")}</strong>
            <span><span id="defense-plan-cost">0</span> / ${ownPower} ⚡</span>
          </div>
          <div id="defense-plan-preview" class="defense-plan-preview">
            <p>${t("reaction.selectDefenseHint")}</p>
          </div>
        </div>

        <button type="submit" id="btn-lock-defense" class="btn btn--primary btn--large defense-lock-btn" disabled>
          ${isSubmitting ? t("reaction.lockingPlan") : t("reaction.lockPlan")}
        </button>
      </form>
    </section>
  `;
};
