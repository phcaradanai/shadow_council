import type { WireDomainEvent, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

interface DisplayDefensePlan {
  readonly guard: 0 | 1 | 2 | 3;
  readonly challenge: boolean;
}

const toDefensePlan = (value: unknown): DisplayDefensePlan => {
  if (typeof value === "object" && value !== null) {
    if ("guard" in value && "challenge" in value) {
      const guard = Number(value.guard);
      return {
        guard: guard >= 0 && guard <= 3 ? (guard as 0 | 1 | 2 | 3) : 0,
        challenge: value.challenge === true,
      };
    }
    if ("type" in value && value.type === "guard" && "amount" in value) {
      const guard = Number(value.amount);
      return {
        guard: guard >= 1 && guard <= 3 ? (guard as 1 | 2 | 3) : 1,
        challenge: false,
      };
    }
  }
  if (value === "challenge") return { guard: 0, challenge: true };
  return { guard: 0, challenge: false };
};

const eventNumber = (event: WireDomainEvent, key: string): number => {
  const value = event[key];
  return typeof value === "number" ? value : 0;
};

export const renderRevealPanel = (
  events: readonly WireDomainEvent[],
  players: readonly WirePlayerView[],
): string => {
  const revealed = events.find((event) => event.type === "ActionRevealed");
  const resolved = events.find((event) => event.type === "AttackResolved");
  const reaction = events.find((event) => event.type === "ReactionCommitted");
  const eliminated = events.filter((event) => event.type === "PlayerEliminated");
  if (!revealed || !resolved) return "";

  const playerMap = new Map(players.map((player) => [player.playerId, player.displayName]));
  const attackerName = escapeHtml(
    playerMap.get(String(revealed.attackerId)) ?? "Attacker",
  );
  const targetName = escapeHtml(playerMap.get(String(revealed.targetId)) ?? "Target");

  const threat = Math.max(1, Math.min(3, eventNumber(revealed, "threat") || 1));
  const force = Math.max(
    0,
    Math.min(3, eventNumber(revealed, "force") || eventNumber(revealed, "funding")),
  );
  const fullyBacked = force === threat;
  const plan = toDefensePlan(resolved.reaction ?? reaction?.choice);
  const targetLoss = eventNumber(resolved, "targetInfluenceLoss");
  const attackerLoss = eventNumber(resolved, "attackerInfluenceLoss");
  const targetInfluence = eventNumber(resolved, "targetInfluence");
  const attackerInfluence = eventNumber(resolved, "attackerInfluence");
  const targetPowerCost = eventNumber(resolved, "targetPowerCost");
  const attackerPowerCost = eventNumber(resolved, "attackerPowerCost");
  const timedOut = reaction?.timedOut === true;
  const timeoutText = timedOut ? t("log.timeoutSuffix") : "";
  const triggeredScheme =
    revealed.triggeredScheme === "ambush" || revealed.triggeredScheme === "bulwark"
      ? revealed.triggeredScheme
      : undefined;
  const damageAbsorbed = eventNumber(resolved, "damageAbsorbed");
  const ambushDamage = eventNumber(resolved, "ambushDamage");

  const reactionLabel =
    plan.guard > 0 && plan.challenge
      ? t("reaction.modeHybrid", { guard: plan.guard })
      : plan.challenge
        ? t("reaction.modeChallenge")
        : plan.guard > 0
          ? t("reaction.modeGuard", { guard: plan.guard })
          : t("reaction.modeYield");

  let headline: string;
  let summary: string;
  let styleClass: string;
  let outcome: string;

  if (plan.challenge && !fullyBacked) {
    headline = t("reveal.bluffCaughtTitle");
    summary = t("reveal.bluffCaughtSummary", {
      attacker: attackerName,
      target: targetName,
      force,
      threat,
    });
    styleClass = "reveal-card--caught";
    outcome = "bluff-caught";
  } else if (plan.challenge && fullyBacked && targetLoss === 0 && plan.guard > 0) {
    headline = t("reveal.challengeGuardedTitle");
    summary = t("reveal.challengeGuardedSummary", {
      target: targetName,
      guard: plan.guard,
    });
    styleClass = "reveal-card--blocked";
    outcome = "challenge-guarded";
  } else if (plan.challenge && fullyBacked) {
    headline = t("reveal.challengeCrushedTitle");
    summary = t("reveal.challengeCrushedSummary", {
      attacker: attackerName,
      target: targetName,
      force,
      threat,
    });
    styleClass = "reveal-card--punished";
    outcome = "challenge-failed";
  } else if (plan.guard > 0 && targetLoss === 0) {
    headline = t("reveal.guardHeldTitle");
    summary = t("reveal.guardHeldSummary", {
      target: targetName,
      guard: plan.guard,
      force,
    });
    styleClass = "reveal-card--blocked";
    outcome = "guard-held";
  } else if (plan.guard > 0) {
    headline = t("reveal.guardBreachedTitle");
    summary = t("reveal.guardBreachedSummary", {
      target: targetName,
      guard: plan.guard,
      force,
      damage: targetLoss,
    });
    styleClass = "reveal-card--punished";
    outcome = "guard-breached";
  } else if (fullyBacked) {
    headline = t("reveal.strikeLandedTitle");
    summary = t("reveal.strikeLandedSummary", {
      attacker: attackerName,
      target: targetName,
      timedOut: timeoutText,
    });
    styleClass = "reveal-card--yielded";
    outcome = "yielded";
  } else {
    headline = t("reveal.bluffSucceededTitle");
    summary = t("reveal.bluffSucceededSummary", {
      attacker: attackerName,
      target: targetName,
      timedOut: timeoutText,
    });
    styleClass = "reveal-card--bluff-won";
    outcome = "bluff-succeeded";
  }

  const schemeFeedback =
    triggeredScheme === undefined
      ? ""
      : `
        <div class="reveal-scheme-trigger" data-scheme="${triggeredScheme}">
          <strong>${t("reveal.schemeTriggered", { scheme: triggeredScheme })}</strong>
          <span>${
            triggeredScheme === "bulwark"
              ? t("reveal.bulwarkAbsorbed")
              : t("reveal.ambushRetaliated")
          }</span>
          ${
            triggeredScheme === "bulwark" && damageAbsorbed > 0
              ? `<small>+${Math.min(1, damageAbsorbed)} Guard</small>`
              : triggeredScheme === "ambush" && ambushDamage > 0
                ? `<small>+${ambushDamage} Influence pressure</small>`
                : ""
          }
        </div>
      `;

  const eliminations =
    eliminated.length === 0
      ? ""
      : `<div class="reveal-card__elimination">${eliminated
          .map((event) =>
            t("reveal.eliminatedNotice", {
              player: escapeHtml(playerMap.get(String(event.playerId)) ?? "Player"),
            }),
          )
          .join(", ")}</div>`;

  return `
    <section class="reveal-section" aria-live="assertive" aria-label="${t("reveal.eyebrow")}">
      <div class="reveal-card ${styleClass}" data-outcome="${outcome}">
        <div class="reveal-card__header">
          <span class="reveal-card__eyebrow">${t("reveal.eyebrow")}</span>
          <h3 class="reveal-card__title">${headline}</h3>
        </div>

        <div class="reveal-timeline">
          <div class="timeline-step">
            <span class="timeline-step__label">${t("reveal.stepThreat")}</span>
            <span class="timeline-step__val">${t("reveal.stepThreatDesc", {
              attacker: attackerName,
              target: targetName,
              threat,
            })}</span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label">${t("reveal.stepReaction")}</span>
            <span class="timeline-step__val">${t("reveal.stepReactionDesc", {
              target: targetName,
              reaction: reactionLabel,
            })}</span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label">${t("reveal.stepTruth")}</span>
            <span class="timeline-step__val"><strong>${
              fullyBacked
                ? t("reveal.valGenuine", { force })
                : t("reveal.valBluff", { force, threat })
            }</strong></span>
          </div>
        </div>

        <p class="reveal-card__summary">${summary}</p>
        ${schemeFeedback}

        <div class="reveal-impact">
          ${
            attackerLoss > 0
              ? `<span class="reveal-impact--danger">${t("reveal.attackerDamageResult", {
                  attacker: attackerName,
                  damage: attackerLoss,
                  remaining: attackerInfluence,
                })}</span>`
              : ""
          }
          <span class="${targetLoss > 0 ? "reveal-impact--danger" : ""}">${t(
            "reveal.damageResult",
            { damage: targetLoss, remaining: targetInfluence },
          )}</span>
          <span>${t("reveal.attackerPowerSpent", { power: attackerPowerCost })}</span>
          <span>${t("reveal.powerSpent", { power: targetPowerCost })}</span>
        </div>

        ${eliminations}
      </div>
    </section>
  `;
};
