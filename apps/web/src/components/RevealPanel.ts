import type { WireDomainEvent, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderRevealPanel = (
  events: readonly WireDomainEvent[],
  players: readonly WirePlayerView[],
): string => {
  const revealedEvent = events.find((e) => e.type === "ActionRevealed");
  const resolvedEvent = events.find((e) => e.type === "AttackResolved");
  const reactionEvent = events.find((e) => e.type === "ReactionCommitted");
  const eliminatedEvents = events.filter((e) => e.type === "PlayerEliminated");

  if (!revealedEvent || !resolvedEvent) return "";

  const playerMap = new Map(players.map((p) => [p.playerId, p.displayName]));
  const attackerName = playerMap.get(String(revealedEvent.attackerId)) ?? "Attacker";
  const targetName = playerMap.get(String(revealedEvent.targetId)) ?? "Target";
  const isGenuine = revealedEvent.genuine === true || revealedEvent.funding === 1;
  const rawReaction = String(
    resolvedEvent.reaction ?? reactionEvent?.choice ?? "yield",
  ).toLowerCase();
  const reactionLabel =
    rawReaction === "guard"
      ? t("reaction.guardTitle")
      : rawReaction === "challenge"
        ? t("reaction.challengeTitle")
        : t("reaction.yieldTitle");
  const timedOut = reactionEvent?.timedOut === true;
  const timeoutText = timedOut ? t("log.timeoutSuffix") : "";

  let verdictHeadline = "";
  let verdictClass = "";
  let verdictOutcome = "";
  let verdictSummary = "";

  if (rawReaction === "guard") {
    if (isGenuine) {
      verdictHeadline = t("reveal.attackBlockedTitle");
      verdictClass = "reveal-card--blocked";
      verdictOutcome = "attack-blocked";
      verdictSummary = t("reveal.attackBlockedSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
      });
    } else {
      verdictHeadline = t("reveal.bluffInducedGuardTitle");
      verdictClass = "reveal-card--bluff-safe";
      verdictOutcome = "bluff-safe";
      verdictSummary = t("reveal.bluffInducedGuardSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
      });
    }
  } else if (rawReaction === "challenge") {
    if (isGenuine) {
      verdictHeadline = t("reveal.challengeCrushedTitle");
      verdictClass = "reveal-card--punished";
      verdictOutcome = "challenge-crushed";
      verdictSummary = t("reveal.challengeCrushedSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
      });
    } else {
      verdictHeadline = t("reveal.bluffCaughtTitle");
      verdictClass = "reveal-card--caught";
      verdictOutcome = "bluff-caught";
      verdictSummary = t("reveal.bluffCaughtSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
      });
    }
  } else {
    // YIELD
    if (isGenuine) {
      verdictHeadline = t("reveal.strikeLandedTitle");
      verdictClass = "reveal-card--yielded";
      verdictOutcome = "strike-landed";
      verdictSummary = t("reveal.strikeLandedSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
        timedOut: timeoutText,
      });
    } else {
      verdictHeadline = t("reveal.bluffSucceededTitle");
      verdictClass = "reveal-card--bluff-won";
      verdictOutcome = "bluff-succeeded";
      verdictSummary = t("reveal.bluffSucceededSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
        timedOut: timeoutText,
      });
    }
  }

  const eliminationsHtml =
    eliminatedEvents.length > 0
      ? `<div class="reveal-card__elimination">${eliminatedEvents
          .map((e) =>
            t("reveal.eliminatedNotice", {
              player: escapeHtml(playerMap.get(String(e.playerId)) ?? "Player"),
            }),
          )
          .join(", ")}</div>`
      : "";

  return `
    <section class="reveal-section" aria-live="assertive" aria-label="${t("reveal.eyebrow")}">
      <div class="reveal-card ${verdictClass}" data-outcome="${verdictOutcome}">
        <div class="reveal-card__header">
          <span class="reveal-card__eyebrow">${t("reveal.eyebrow")}</span>
          <h3 class="reveal-card__title">${verdictHeadline}</h3>
        </div>

        <div class="reveal-timeline">
          <div class="timeline-step">
            <span class="timeline-step__label">${t("reveal.stepThreat")}</span>
            <span class="timeline-step__val">${t("reveal.stepThreatDesc", { attacker: escapeHtml(attackerName), target: escapeHtml(targetName) })}</span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label">${t("reveal.stepReaction")}</span>
            <span class="timeline-step__val">${t("reveal.stepReactionDesc", { target: escapeHtml(targetName), reaction: reactionLabel })}</span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label">${t("reveal.stepTruth")}</span>
            <span class="timeline-step__val"><strong>${isGenuine ? t("reveal.valGenuine") : t("reveal.valBluff")}</strong></span>
          </div>
        </div>

        <p class="reveal-card__summary">${verdictSummary}</p>
        ${eliminationsHtml}
      </div>
    </section>
  `;
};
