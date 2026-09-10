import type { WireDomainEvent, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const formatReactionChoice = (choice: unknown): string => {
  const c = String(choice ?? "yield").toLowerCase();
  if (c === "guard") return t("rules.tableGuardName");
  if (c === "challenge") return t("rules.tableChallengeName");
  if (c === "yield") return t("rules.tableYieldName");
  return escapeHtml(c.toUpperCase());
};

const formatEvent = (event: WireDomainEvent, playerMap: Map<string, string>): string => {
  const getName = (id: unknown) => playerMap.get(String(id)) ?? String(id ?? "Player");

  switch (event.type) {
    case "ActionCommitted":
      return t("log.actionCommitted", {
        attacker: escapeHtml(getName(event.attackerId)),
        target: escapeHtml(getName(event.targetId)),
      });
    case "ReactionCommitted":
      return t("log.reactionCommitted", {
        target: escapeHtml(getName(event.targetId)),
        choice: formatReactionChoice(event.choice),
        timeout: event.timedOut ? t("log.timeoutSuffix") : "",
      });
    case "ActionRevealed": {
      const truth = event.genuine ? t("reveal.valGenuine") : t("reveal.valBluff");
      return t("log.actionRevealed", {
        attacker: escapeHtml(getName(event.attackerId)),
        truth,
      });
    }
    case "BluffSucceeded":
      return t("log.bluffSucceeded", {
        attacker: escapeHtml(getName(event.attackerId)),
        target: escapeHtml(getName(event.targetId)),
      });
    case "PowerRecovered":
      return t("log.powerRecovered", {
        player: escapeHtml(getName(event.playerId)),
        power: String(event.power ?? "?"),
      });
    case "TurnPassed":
      return t("log.turnPassed", {
        player: escapeHtml(getName(event.playerId)),
      });
    case "PlayerEliminated":
      return t("log.playerEliminated", {
        player: escapeHtml(getName(event.playerId)),
      });
    case "RoundStarted":
      return t("log.roundStarted", {
        round: String(event.round ?? "?"),
      });
    case "VictoryAchieved":
      return t("log.victoryAchieved", {
        winner: escapeHtml(getName(event.winnerId)),
      });
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
    <section class="event-log" aria-label="${t("log.title")}">
      <details class="event-log__details" open>
        <summary class="event-log__summary">${t("log.title")}</summary>
        <ol class="event-log__list">
          ${events.map((e) => `<li class="event-log__item">${formatEvent(e, playerMap)}</li>`).join("")}
        </ol>
      </details>
    </section>
  `;
};
