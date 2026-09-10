import type { WireDomainEvent, WirePlayerView } from "@shadow-council/protocol";

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
  const bluffSucceededEvent = events.find((e) => e.type === "BluffSucceeded");
  const eliminatedEvents = events.filter((e) => e.type === "PlayerEliminated");

  if (!revealedEvent || !resolvedEvent) return "";

  const playerMap = new Map(players.map((p) => [p.playerId, p.displayName]));
  const attackerName = playerMap.get(String(revealedEvent.attackerId)) ?? "Attacker";
  const targetName = playerMap.get(String(revealedEvent.targetId)) ?? "Target";
  const isGenuine = revealedEvent.genuine === true || revealedEvent.funding === 1;
  const reaction = String(resolvedEvent.reaction ?? reactionEvent?.choice ?? "yield").toUpperCase();
  const timedOut = reactionEvent?.timedOut === true;

  let verdictHeadline = "";
  let verdictClass = "";
  let verdictSummary = "";

  if (reaction === "GUARD") {
    if (isGenuine) {
      verdictHeadline = "🛡️ ATTACK BLOCKED!";
      verdictClass = "reveal-card--blocked";
      verdictSummary = `${attackerName} attacked genuinely, but ${targetName} spent 1 Power to Guard safely. Neither lost Influence!`;
    } else {
      verdictHeadline = "🎭 BLUFF INDUCED GUARD!";
      verdictClass = "reveal-card--bluff-safe";
      verdictSummary = `${attackerName} was bluffing! ${targetName} spent 1 Power guarding against an empty threat.`;
    }
  } else if (reaction === "CHALLENGE") {
    if (isGenuine) {
      verdictHeadline = "💥 CHALLENGE CRUSHED!";
      verdictClass = "reveal-card--punished";
      verdictSummary = `${attackerName}'s Strike was 100% GENUINE! ${targetName} challenged in vain and suffers 2 Influence damage!`;
    } else {
      verdictHeadline = "🚨 BLUFF CAUGHT!";
      verdictClass = "reveal-card--caught";
      verdictSummary = `BLUFF EXPOSED! ${attackerName} faked the strike. ${targetName}'s challenge succeeded! ${attackerName} loses 1 Influence!`;
    }
  } else {
    // YIELD
    if (isGenuine) {
      verdictHeadline = "🗡️ STRIKE LANDED!";
      verdictClass = "reveal-card--yielded";
      verdictSummary = `${targetName} yielded ${timedOut ? "(Timeout)" : ""} to ${attackerName}'s genuine Strike. ${targetName} takes 1 Influence damage.`;
    } else {
      verdictHeadline = "🃏 BLUFF SUCCEEDED!";
      verdictClass = "reveal-card--bluff-won";
      verdictSummary = `${attackerName} stole an Influence point with a pure bluff! ${targetName} yielded ${timedOut ? "(Timeout)" : ""}.`;
    }
  }

  const eliminationsHtml =
    eliminatedEvents.length > 0
      ? `<div class="reveal-card__elimination">☠️ ${eliminatedEvents
          .map((e) => escapeHtml(playerMap.get(String(e.playerId)) ?? "A player"))
          .join(", ")} has been ELIMINATED!</div>`
      : "";

  return `
    <section class="reveal-section" aria-live="assertive" aria-label="Resolution Outcome">
      <div class="reveal-card ${verdictClass}">
        <div class="reveal-card__header">
          <span class="reveal-card__eyebrow">Clash Resolution</span>
          <h3 class="reveal-card__title">${verdictHeadline}</h3>
        </div>

        <div class="reveal-timeline">
          <div class="timeline-step">
            <span class="timeline-step__label">1. Threat</span>
            <span class="timeline-step__val"><strong>${escapeHtml(attackerName)}</strong> struck at <strong>${escapeHtml(targetName)}</strong></span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label">2. Reaction</span>
            <span class="timeline-step__val"><strong>${escapeHtml(targetName)}</strong> chose <strong>${reaction}</strong></span>
          </div>
          <div class="timeline-step">
            <span class="timeline-step__label">3. Truth Revealed</span>
            <span class="timeline-step__val"><strong>${isGenuine ? "🗡️ GENUINE (1 Power)" : "🎭 BLUFF (0 Power)"}</strong></span>
          </div>
        </div>

        <p class="reveal-card__summary">${escapeHtml(verdictSummary)}</p>
        ${eliminationsHtml}
      </div>
    </section>
  `;
};
