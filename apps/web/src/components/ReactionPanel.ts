import type { WireMatchView } from "@shadow-council/protocol";

export const renderReactionControls = (
  match: WireMatchView,
  viewerId: string,
  isSubmitting: boolean,
): string => {
  if (match.phase.kind !== "REACTION" || match.phase.targetId !== viewerId) {
    return "";
  }

  const selfPlayer = match.players.find((p) => p.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const reactIntent = match.legalIntents.find((i) => i.type === "REACT");
  const choices = reactIntent?.choices ?? [];
  const canGuard = choices.includes("guard");

  return `
    <section class="reaction-panel" aria-label="Reaction Decisions">
      <h3 class="reaction-panel__title">How Do You Respond?</h3>
      <p class="reaction-panel__hint">You are being targeted! Read your opponent and choose your defensive stance:</p>

      <div class="reaction-grid">
        <!-- Guard -->
        <div class="reaction-card ${!canGuard ? "reaction-card--disabled" : ""}">
          <div class="reaction-card__icon">🛡️</div>
          <h4 class="reaction-card__name">Guard</h4>
          <span class="reaction-card__cost">Cost: 1 Power</span>
          <p class="reaction-card__desc">Play it safe. Spend 1 Power to deflect the strike completely. You lose 0 Influence regardless of whether the strike was genuine or a bluff.</p>
          <button type="button" class="btn btn--guard reaction-btn" data-choice="guard" ${!canGuard || isSubmitting ? "disabled" : ""}>
            ${!canGuard ? "Requires 1 Power" : isSubmitting ? "Locking Guard..." : "🛡️ Guard (1 Power)"}
          </button>
        </div>

        <!-- Challenge -->
        <div class="reaction-card reaction-card--challenge">
          <div class="reaction-card__icon">👁️</div>
          <h4 class="reaction-card__name">Challenge</h4>
          <span class="reaction-card__cost">Cost: 0 Power</span>
          <p class="reaction-card__desc">Call their bluff! If they bluffed, <strong>THEY lose 1 Influence</strong>. But if the strike was genuine, <strong>YOU lose 2 Influence</strong>!</p>
          <button type="button" class="btn btn--challenge reaction-btn" data-choice="challenge" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? "Locking Challenge..." : "👁️ Challenge Bluff"}
          </button>
        </div>

        <!-- Yield -->
        <div class="reaction-card reaction-card--yield">
          <div class="reaction-card__icon">🏳️</div>
          <h4 class="reaction-card__name">Yield</h4>
          <span class="reaction-card__cost">Cost: 0 Power</span>
          <p class="reaction-card__desc">Accept the loss to preserve your resources. You spend no Power, but you lose 1 Influence unconditionally.</p>
          <button type="button" class="btn btn--yield reaction-btn" data-choice="yield" ${isSubmitting ? "disabled" : ""}>
            ${isSubmitting ? "Yielding..." : "🏳️ Yield (-1 Inf)"}
          </button>
        </div>
      </div>
    </section>
  `;
};
