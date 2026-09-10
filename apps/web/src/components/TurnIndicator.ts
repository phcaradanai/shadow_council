import type { WireMatchView } from "@shadow-council/protocol";

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
      <div class="turn-banner turn-banner--finished" role="status" aria-live="polite">
        <h2 class="turn-banner__headline">${isWinner ? "🏆 VICTORY IS YOURS!" : `👑 ${escapeHtml(winnerName)} HAS WON!`}</h2>
        <p class="turn-banner__subline">The Council has fallen. Only one survivor remains in the shadows.</p>
      </div>
    `;
  }

  if (phase.kind === "ACTIVE_TURN") {
    const isActor = phase.activePlayerId === viewerId;
    const actorName = playerMap.get(phase.activePlayerId) ?? "Unknown";

    if (isActor) {
      return `
        <div class="turn-banner turn-banner--your-turn" role="status" aria-live="polite">
          <div class="turn-banner__badge">YOUR TURN</div>
          <h2 class="turn-banner__headline">Choose an Action: Strike or Recover</h2>
          <p class="turn-banner__subline">Claim a Strike against an opponent (Genuine or Bluff), or Recover 1 Power.</p>
        </div>
      `;
    }

    return `
      <div class="turn-banner turn-banner--waiting" role="status" aria-live="polite">
        <div class="turn-banner__badge">WAITING</div>
        <h2 class="turn-banner__headline">Waiting for ${escapeHtml(actorName)}...</h2>
        <p class="turn-banner__subline">${escapeHtml(actorName)} is contemplating their move.</p>
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
        <div class="turn-banner turn-banner--targeted" role="status" aria-live="assertive">
          <div class="turn-banner__badge turn-banner__badge--danger">UNDER ATTACK</div>
          <h2 class="turn-banner__headline">${escapeHtml(attackerName)} has declared a Strike on YOU!</h2>
          <p class="turn-banner__subline">Is it a genuine strike or a daring bluff? Choose your reaction: Guard, Challenge, or Yield.</p>
        </div>
      `;
    }

    if (isAttacker) {
      const isBluff = phase.pendingFunding === 0;
      return `
        <div class="turn-banner turn-banner--threat" role="status" aria-live="polite">
          <div class="turn-banner__badge">THREAT COMMITTED</div>
          <h2 class="turn-banner__headline">Strike declared against ${escapeHtml(targetName)}</h2>
          <p class="turn-banner__subline">You committed a <strong>${isBluff ? "BLUFF (0 Power)" : "GENUINE ATTACK (1 Power)"}</strong>. Waiting for ${escapeHtml(targetName)} to react...</p>
        </div>
      `;
    }

    return `
      <div class="turn-banner turn-banner--waiting" role="status" aria-live="polite">
        <div class="turn-banner__badge">CLASH IN PROGRESS</div>
        <h2 class="turn-banner__headline">${escapeHtml(attackerName)} struck at ${escapeHtml(targetName)}!</h2>
        <p class="turn-banner__subline">Waiting for ${escapeHtml(targetName)} to choose their defense.</p>
      </div>
    `;
  }

  return "";
};
