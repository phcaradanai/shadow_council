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
  const playerMap = new Map(match.players.map((player) => [player.playerId, player.displayName]));

  if (phase.kind === "FINISHED") {
    const winnerName = playerMap.get(phase.winnerId) ?? "Unknown";
    const isWinner = phase.winnerId === viewerId;
    const summary = isWinner
      ? t("game.turnFinishedVictory")
      : t("game.turnFinishedWinner", { winner: escapeHtml(winnerName) });
    return `
      <div class="phase-status phase-status--finished turn-banner turn-banner--finished" data-state="finished" role="status" aria-live="polite">
        <span class="phase-status__dot" aria-hidden="true"></span>
        <span class="phase-status__text turn-banner__title">${summary}</span>
      </div>
    `;
  }

  if (phase.kind === "ACTIVE_TURN") {
    const isActor = phase.activePlayerId === viewerId;
    if (isActor) {
      return `
        <div class="phase-status phase-status--your-turn turn-banner turn-banner--your-turn" data-state="your-turn" role="status" aria-live="polite">
          <span class="phase-status__dot" aria-hidden="true"></span>
          <span class="phase-status__text">
            <span class="turn-banner__badge">${t("game.turnYourTurn")}</span>
            <span aria-hidden="true"> · </span>
            <span class="turn-banner__title">${t("game.turnChooseAction")}</span>
          </span>
        </div>
      `;
    }

    const actorName = playerMap.get(phase.activePlayerId) ?? "Unknown";
    return `
      <div class="phase-status phase-status--waiting turn-banner turn-banner--waiting" data-state="waiting" role="status" aria-live="polite">
        <span class="phase-status__dot" aria-hidden="true"></span>
        <span class="phase-status__text turn-banner__title">
          ${t("game.turnWaitingFor", { player: escapeHtml(actorName) })}
        </span>
      </div>
    `;
  }

  if (phase.kind === "REACTION") {
    const isAttacker = phase.attackerId === viewerId;
    const isTarget = phase.targetId === viewerId;
    const attackerName = playerMap.get(phase.attackerId) ?? "Attacker";
    const targetName = playerMap.get(phase.targetId) ?? "Target";
    const threat = phase.threat ?? 1;

    if (isTarget) {
      return `
        <div class="phase-status phase-status--targeted turn-banner turn-banner--targeted" data-state="under-attack" role="status" aria-live="assertive">
          <span class="phase-status__dot" aria-hidden="true"></span>
          <span class="phase-status__text">
            <span class="turn-banner__badge turn-banner__badge--danger">${t("game.turnUnderAttack")}</span>
            <span aria-hidden="true"> · </span>
            <span class="turn-banner__title">${t("game.turnAttackedBy", {
              player: escapeHtml(attackerName),
              threat,
            })}</span>
          </span>
        </div>
      `;
    }

    if (isAttacker) {
      const force = phase.pendingForce;
      const isBluff = force !== undefined && force < threat;
      const detail =
        force !== undefined
          ? isBluff
            ? t("game.turnYouCommittedBluff", {
                threat,
                force,
                player: escapeHtml(targetName),
              })
            : t("game.turnYouCommittedGenuine", {
                threat,
                force,
                player: escapeHtml(targetName),
              })
          : `${t("game.turnThreatCommitted")} · ${t("game.turnThreatDeclaredAgainst", {
              player: escapeHtml(targetName),
              threat,
            })}`;

      return `
        <div class="phase-status phase-status--committed turn-banner turn-banner--threat" data-state="threat-committed" role="status" aria-live="polite">
          <span class="phase-status__dot" aria-hidden="true"></span>
          <span class="phase-status__text">
            <span class="turn-banner__badge">${t("game.turnThreatCommitted")}</span>
            <span aria-hidden="true"> · </span>
            <span class="turn-banner__title">${detail}</span>
          </span>
        </div>
      `;
    }

    return `
      <div class="phase-status phase-status--clash turn-banner turn-banner--clash" data-state="clash-in-progress" role="status" aria-live="polite">
        <span class="phase-status__dot" aria-hidden="true"></span>
        <span class="phase-status__text">
          <span class="turn-banner__badge">${t("game.turnClashInProgress")}</span>
          <span aria-hidden="true"> · </span>
          <span class="turn-banner__title">${t("game.turnClashHeadline", {
            attacker: escapeHtml(attackerName),
            target: escapeHtml(targetName),
            threat,
          })}</span>
        </span>
      </div>
    `;
  }

  return "";
};
