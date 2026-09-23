import type { WireMatchView } from "@shadow-council/protocol";
import { t } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const renderPhaseStatus = (
  state: string,
  variant: string,
  text: string,
  ariaLive = "polite",
): string => `
  <div class="phase-status phase-status--${variant}" data-state="${state}" role="status" aria-live="${ariaLive}">
    <span class="phase-status__dot" aria-hidden="true"></span>
    <span class="phase-status__text">${text}</span>
  </div>
`;

export const renderTurnIndicator = (match: WireMatchView, viewerId: string): string => {
  const phase = match.phase;
  const playerMap = new Map(match.players.map((player) => [player.playerId, player.displayName]));

  if (phase.kind === "FINISHED") {
    const winnerName = playerMap.get(phase.winnerId) ?? "Unknown";
    const isWinner = phase.winnerId === viewerId;
    const summary = isWinner
      ? t("game.turnFinishedVictory")
      : t("game.turnFinishedWinner", { winner: escapeHtml(winnerName) });
    return renderPhaseStatus("finished", "finished", summary);
  }

  if (phase.kind === "ACTIVE_TURN") {
    const isActor = phase.activePlayerId === viewerId;
    if (isActor) {
      return renderPhaseStatus("your-turn", "your-turn", t("game.turnYourTurn"));
    }

    const actorName = playerMap.get(phase.activePlayerId) ?? "Unknown";
    return renderPhaseStatus(
      "waiting",
      "waiting",
      t("game.turnWaitingFor", { player: escapeHtml(actorName) }),
    );
  }

  if (phase.kind === "REACTION") {
    const isAttacker = phase.attackerId === viewerId;
    const isTarget = phase.targetId === viewerId;
    const attackerName = playerMap.get(phase.attackerId) ?? "Attacker";
    const targetName = playerMap.get(phase.targetId) ?? "Target";
    const threat = phase.threat ?? 1;

    if (isTarget) {
      return renderPhaseStatus(
        "under-attack",
        "targeted",
        `${t("game.turnUnderAttack")} · ${t("game.turnAttackedBy", {
          player: escapeHtml(attackerName),
          threat,
        })}`,
        "assertive",
      );
    }

    if (isAttacker) {
      return renderPhaseStatus(
        "threat-committed",
        "committed",
        `${t("game.turnThreatCommitted")} · ${t("game.turnThreatDeclaredAgainst", {
          player: escapeHtml(targetName),
          threat,
        })}`,
      );
    }

    return renderPhaseStatus(
      "clash-in-progress",
      "clash",
      t("game.turnClashHeadline", {
        attacker: escapeHtml(attackerName),
        target: escapeHtml(targetName),
        threat,
      }),
    );
  }

  return "";
};
