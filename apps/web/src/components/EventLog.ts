import type { WireDomainEvent, WirePlayerView } from "@shadow-council/protocol";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatEvent = (event: WireDomainEvent, playerMap: Map<string, string>): string => {
  const getName = (id: unknown) => playerMap.get(String(id)) ?? String(id ?? "Player");

  switch (event.type) {
    case "ActionCommitted":
      return `⚔️ <strong>${escapeHtml(getName(event.attackerId))}</strong> claimed Strike on <strong>${escapeHtml(getName(event.targetId))}</strong> (commitment hidden).`;
    case "ReactionCommitted":
      return `🛡️ <strong>${escapeHtml(getName(event.targetId))}</strong> locked reaction: <strong>${escapeHtml(String(event.choice ?? "yield")).toUpperCase()}</strong>${event.timedOut ? " (by timeout)" : ""}.`;
    case "ActionRevealed":
      return `👁️ Reveal: <strong>${escapeHtml(getName(event.attackerId))}</strong>'s Strike was <strong>${event.genuine ? "GENUINE (1 Power)" : "a BLUFF (0 Power)"}</strong>.`;
    case "BluffSucceeded":
      return `🃏 Bluff succeeded: <strong>${escapeHtml(getName(event.attackerId))}</strong> won the bluff against <strong>${escapeHtml(getName(event.targetId))}</strong>!`;
    case "PowerRecovered":
      return `⚡ <strong>${escapeHtml(getName(event.playerId))}</strong> recovered +1 Power (now ${event.power ?? "?"}).`;
    case "TurnPassed":
      return `⌛ <strong>${escapeHtml(getName(event.playerId))}</strong>'s turn timed out (passed).`;
    case "PlayerEliminated":
      return `☠️ <strong>${escapeHtml(getName(event.playerId))}</strong> has been eliminated!`;
    case "RoundStarted":
      return `🔄 Round ${event.round ?? "?"} began.`;
    case "VictoryAchieved":
      return `👑 <strong>${escapeHtml(getName(event.winnerId))}</strong> has achieved victory!`;
    default:
      return escapeHtml(event.type);
  }
};

export const renderEventLog = (
  events: readonly WireDomainEvent[],
  players: readonly WirePlayerView[],
): string => {
  if (events.length === 0) return "";
  const playerMap = new Map(players.map((p) => [p.playerId, p.displayName]));

  return `
    <section class="event-log" aria-label="Game Chronicle">
      <details class="event-log__details" open>
        <summary class="event-log__summary">📜 Chronicle (Recent Events)</summary>
        <ol class="event-log__list">
          ${events.map((e) => `<li class="event-log__item">${formatEvent(e, playerMap)}</li>`).join("")}
        </ol>
      </details>
    </section>
  `;
};
