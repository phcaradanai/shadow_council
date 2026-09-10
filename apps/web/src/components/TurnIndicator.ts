import type { WireMatchView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderTurnIndicator = (match: WireMatchView, viewerId: string): string => {
  const phase = match.phase;
  const playerMap = new Map(match.players.map((p) => [p.playerId, p.displayName]));

  if (phase.kind === "FINISHED") {
    const winnerName = playerMap.get(phase.winnerId) ?? "Unknown";
    const isWinner = phase.winnerId === viewerId;
    return `
      <div class="turn-banner turn-banner--finished" data-state="finished" role="status" aria-live="polite">
        <h2 class="turn-banner__headline">${isWinner ? t("game.turnFinishedVictory") : t("game.turnFinishedWinner", { winner: escapeHtml(winnerName) })}</h2>
        <p class="turn-banner__subline">${t("game.turnFinishedDesc")}</p>
      </div>
    `;
  }

  if (phase.kind === "ACTIVE_TURN") {
    const isActor = phase.activePlayerId === viewerId;
    const actorName = playerMap.get(phase.activePlayerId) ?? "Unknown";

    if (isActor) {
      return `
        <div class="turn-banner turn-banner--your-turn" data-state="your-turn" role="status" aria-live="polite">
          <div class="turn-banner__badge">${t("game.turnYourTurn")}</div>
          <h2 class="turn-banner__headline">${t("game.turnChooseAction")}</h2>
          <p class="turn-banner__subline">${t("game.turnChooseActionDesc")}</p>
        </div>
      `;
    }

    return `
      <div class="turn-banner turn-banner--waiting" data-state="waiting" role="status" aria-live="polite">
        <div class="turn-banner__badge">${t("game.turnWaitingFor", { player: escapeHtml(actorName) })}</div>
        <h2 class="turn-banner__headline">${t("game.turnWaitingFor", { player: escapeHtml(actorName) })}</h2>
        <p class="turn-banner__subline">${t("game.turnWaitingForDesc", { player: escapeHtml(actorName) })}</p>
      </div>
    `;
  }

  if (phase.kind === "REACTION") {
    const isAttacker = phase.attackerId === viewerId;
    const isTarget = phase.targetId === viewerId;
    const attackerName = playerMap.get(phase.attackerId) ?? "Attacker";
    const targetName = playerMap.get(phase.targetId) ?? "Target";

    if (isTarget) {
      return `
        <div class="turn-banner turn-banner--targeted" data-state="under-attack" role="status" aria-live="assertive">
          <div class="turn-banner__badge turn-banner__badge--danger" data-state="under-attack">${t("game.turnUnderAttack")}</div>
          <h2 class="turn-banner__headline">${t("game.turnAttackedBy", { player: escapeHtml(attackerName) })}</h2>
          <p class="turn-banner__subline">${t("game.turnAttackedByDesc")}</p>
        </div>
      `;
    }

    if (isAttacker) {
      const isBluff = phase.pendingFunding === 0;
      return `
        <div class="turn-banner turn-banner--threat" data-state="threat-committed" role="status" aria-live="polite">
          <div class="turn-banner__badge">${t("game.turnThreatCommitted")}</div>
          <h2 class="turn-banner__headline">${t("game.turnThreatDeclaredAgainst", { player: escapeHtml(targetName) })}</h2>
          <p class="turn-banner__subline">${isBluff ? t("game.turnYouCommittedBluff", { player: escapeHtml(targetName) }) : t("game.turnYouCommittedGenuine", { player: escapeHtml(targetName) })}</p>
        </div>
      `;
    }

    return `
      <div class="turn-banner turn-banner--waiting" data-state="clash-in-progress" role="status" aria-live="polite">
        <div class="turn-banner__badge">${t("game.turnClashInProgress")}</div>
        <h2 class="turn-banner__headline">${t("game.turnClashHeadline", { attacker: escapeHtml(attackerName), target: escapeHtml(targetName) })}</h2>
        <p class="turn-banner__subline">${t("game.turnClashWaitingReaction", { target: escapeHtml(targetName) })}</p>
      </div>
    `;
  }

  return "";
};
