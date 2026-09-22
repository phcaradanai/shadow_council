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
  const threat = revealedEvent.threat ?? 1;
  const force = revealedEvent.force ?? (revealedEvent.funding as number | undefined) ?? 0;
  const isGenuine = revealedEvent.genuine === true || force === threat;

  const rawReaction = resolvedEvent.reaction ?? reactionEvent?.choice ?? "yield";
  const plan =
    typeof rawReaction === "object" &&
    rawReaction !== null &&
    "guard" in rawReaction &&
    "challenge" in rawReaction
      ? {
          guard: Number(rawReaction.guard) as 0 | 1 | 2 | 3,
          challenge: rawReaction.challenge === true,
        }
      : plan.challenge
        ? { guard: 0 as const, challenge: true }
        : typeof rawReaction === "object" &&
            rawReaction !== null &&
            "type" in rawReaction &&
            rawReaction.type === "guard"
          ? { guard: Number(rawReaction.amount) as 1 | 2 | 3, challenge: false }
          : { guard: 0 as const, challenge: false };

  const reactionLabel =
    plan.guard > 0 && plan.challenge
      ? t("reaction.modeHybrid", { guard: plan.guard })
      : plan.challenge
        ? t("reaction.challengeTitle")
        : plan.guard > 0
          ? t("reaction.modeGuard", { guard: plan.guard })
          : t("reaction.yieldTitle");
  const timedOut = reactionEvent?.timedOut === true;
  const timeoutText = timedOut ? t("log.timeoutSuffix") : "";

  let verdictHeadline = "";
  let verdictClass = "";
  let verdictOutcome = "";
  let verdictSummary = "";

  if (plan.guard > 0 && !plan.challenge) {
    if (isGenuine) {
      verdictHeadline = t("reveal.attackBlockedTitle");
      verdictClass = "reveal-card--blocked";
      verdictOutcome = "attack-blocked";
      verdictSummary = t("reveal.attackBlockedSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
        force,
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
  } else if (plan.challenge) {
    if (isGenuine) {
      verdictHeadline = t("reveal.challengeCrushedTitle");
      verdictClass = "reveal-card--punished";
      verdictOutcome = "challenge-crushed";
      verdictSummary = t("reveal.challengeCrushedSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
        force,
        threat,
      });
    } else {
      verdictHeadline = t("reveal.bluffCaughtTitle");
      verdictClass = "reveal-card--caught";
      verdictOutcome = "bluff-caught";
      verdictSummary = t("reveal.bluffCaughtSummary", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
        force,
        threat,
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
      ? `<div class="reveal-card__elimination text-red-400 font-bold mt-2">${eliminatedEvents
          .map((e) =>
            t("reveal.eliminatedNotice", {
              player: escapeHtml(playerMap.get(String(e.playerId)) ?? "Player"),
            }),
          )
          .join(", ")}</div>`
      : "";

  return `
    <section class="reveal-section my-4" aria-live="assertive" aria-label="${t("reveal.eyebrow")}">
      <div class="reveal-card ${verdictClass} border border-amber-500/40 bg-neutral-900/90 p-4 rounded-xl" data-outcome="${verdictOutcome}">
        <div class="reveal-card__header mb-3">
          <span class="reveal-card__eyebrow text-xs uppercase tracking-wider text-amber-400">${t("reveal.eyebrow")}</span>
          <h3 class="reveal-card__title text-lg font-bold">${verdictHeadline}</h3>
        </div>

        <div class="reveal-timeline grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 bg-neutral-950/60 p-3 rounded border border-neutral-800">
          <div class="timeline-step">
            <span class="timeline-step__label block text-xs text-neutral-400">${t("reveal.stepThreat")}</span>
            <span class="timeline-step__val text-sm font-semibold">${t("reveal.stepThreatDesc", { attacker: escapeHtml(attackerName), target: escapeHtml(targetName), threat })}</span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label block text-xs text-neutral-400">${t("reveal.stepReaction")}</span>
            <span class="timeline-step__val text-sm font-semibold">${t("reveal.stepReactionDesc", { target: escapeHtml(targetName), reaction: reactionLabel })}</span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label block text-xs text-neutral-400">${t("reveal.stepTruth")}</span>
            <span class="timeline-step__val text-sm"><strong>${isGenuine ? t("reveal.valGenuine", { force }) : t("reveal.valBluff", { force, threat })}</strong></span>
          </div>
        </div>

        <p class="reveal-card__summary text-sm text-neutral-300">${verdictSummary}</p>
        <div class="reveal-impact">
          <span>${t("reveal.damageResult", {
            damage: Number(resolvedEvent.targetInfluenceLoss ?? 0),
            remaining: Number(resolvedEvent.targetInfluence ?? 0),
          })}</span>
          <span>${t("reveal.powerSpent", {
            power: Number(resolvedEvent.targetPowerCost ?? 0),
          })}</span>
        </div>
        ${eliminationsHtml}
      </div>
    </section>
  `;
};
