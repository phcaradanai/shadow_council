import type { WireDomainEvent, WirePlayerView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const formatReactionChoice = (choice: unknown): string => {
  if (
    typeof choice === "object" &&
    choice !== null &&
    "guard" in choice &&
    "challenge" in choice
  ) {
    const guard = Number(choice.guard);
    const challenge = choice.challenge === true;
    if (guard > 0 && challenge) return t("reaction.modeHybrid", { guard });
    if (challenge) return t("reaction.modeChallenge");
    if (guard > 0) return t("reaction.modeGuard", { guard });
    return t("reaction.modeYield");
  }

  if (typeof choice === "object" && choice !== null && "type" in choice) {
    const obj = choice as { type: string; amount?: number };
    if (obj.type === "guard") {
      return `${t("rules.tableGuardName")} (${obj.amount ?? 1} Pw)`;
    }
  }
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
        threat: event.threat ?? 1,
      });
    case "ReactionCommitted":
      return t("log.reactionCommitted", {
        target: escapeHtml(getName(event.targetId)),
        choice: formatReactionChoice(event.choice),
        timeout: event.timedOut ? t("log.timeoutSuffix") : "",
      });
    case "ActionRevealed": {
      const truth = event.genuine
        ? t("reveal.valGenuine", { force: event.force ?? 1 })
        : t("reveal.valBluff", { force: event.force ?? 0, threat: event.threat ?? 1 });
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
        powerGained: event.powerGained ?? 2,
      });
    case "SchemePrepared":
      return t("log.schemePrepared", {
        player: escapeHtml(getName(event.playerId)),
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
  const latestEvent = events[events.length - 1];
  const latestEventText = latestEvent ? formatEvent(latestEvent, playerMap) : "";

  return `
    <section class="event-log chronicle-drawer my-4" aria-label="${t("log.title")}">
      <details class="event-log__details bg-neutral-900/60 border border-neutral-800 rounded-lg p-3">
        <summary class="event-log__summary cursor-pointer font-bold text-sm text-neutral-300">
          <span class="event-log__summary-main">📜 ${t("log.title")}</span>
          ${latestEventText ? `<span class="event-log__summary-preview ml-2 font-normal text-xs text-neutral-400">(${t("log.latest")}: ${latestEventText})</span>` : ""}
        </summary>
        <ol class="event-log__list mt-2 space-y-1 text-xs text-neutral-300 max-h-48 overflow-y-auto">
          ${events.map((e) => `<li class="event-log__item py-0.5 border-b border-neutral-800/40">${formatEvent(e, playerMap)}</li>`).join("")}
        </ol>
      </details>
    </section>
  `;
};
