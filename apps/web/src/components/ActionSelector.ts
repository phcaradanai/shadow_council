import type { WireMatchView } from "@shadow-council/protocol";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const renderActionControls = (
  match: WireMatchView,
  viewerId: string,
  isSubmitting: boolean,
): string => {
  if (match.phase.kind !== "ACTIVE_TURN" || match.phase.activePlayerId !== viewerId) {
    return "";
  }

  const selfPlayer = match.players.find((p) => p.playerId === viewerId);
  if (!selfPlayer || selfPlayer.eliminated) return "";

  const strikeIntent = match.legalIntents.find((i) => i.type === "STRIKE");
  const recoverIntent = match.legalIntents.find((i) => i.type === "RECOVER");
  const canRecover = recoverIntent !== undefined;
  const targetIds = strikeIntent?.targetIds ?? [];
  const fundingOptions = strikeIntent?.funding ?? [];
  const canFundGenuine = fundingOptions.includes(1);

  const targets = match.players.filter((p) => targetIds.includes(p.playerId));

  return `
    <section class="action-panel" aria-label="Action Controls">
      <h3 class="action-panel__title">Your Action</h3>

      <div class="action-options">
        <!-- Strike Option Card -->
        <div class="action-card action-card--strike">
          <div class="action-card__header">
            <h4>⚔️ Claim a Strike</h4>
            <span class="action-card__badge">Bluff or Attack</span>
          </div>
          <p class="action-card__desc">Choose an opponent to threaten. Privately decide whether to spend 1 Power on a genuine blow or bluff for free.</p>

          <form id="strike-form" class="action-form">
            <div class="form-group">
              <label for="strike-target" class="form-label">Choose Target:</label>
              <select id="strike-target" name="targetId" class="form-select" required ${isSubmitting ? "disabled" : ""}>
                <option value="" disabled selected>Select an opponent...</option>
                ${targets
                  .map(
                    (t) =>
                      `<option value="${escapeHtml(t.playerId)}">${escapeHtml(t.displayName)} (Inf: ${t.influence}, Pwr: ${t.power})</option>`,
                  )
                  .join("")}
              </select>
            </div>

            <fieldset class="form-fieldset">
              <legend class="form-legend">Secret Commitment (Concealed from others):</legend>
              <div class="funding-options">
                <label class="radio-card">
                  <input type="radio" name="funding" value="0" ${isSubmitting ? "disabled" : ""} />
                  <div class="radio-card__content">
                    <span class="radio-card__title">🎭 Bluff (0 Power)</span>
                    <span class="radio-card__desc">Free threat. Deals 1 Influence if they yield or guard. If Challenged, YOU lose 1 Influence!</span>
                  </div>
                </label>

                <label class="radio-card ${!canFundGenuine ? "radio-card--disabled" : ""}">
                  <input type="radio" name="funding" value="1" ${!canFundGenuine ? "disabled" : ""} ${isSubmitting ? "disabled" : ""} />
                  <div class="radio-card__content">
                    <span class="radio-card__title">🗡️ Genuine Attack (1 Power)</span>
                    <span class="radio-card__desc">${canFundGenuine ? "Costs 1 Power. Punishes a Challenge with 2 Influence loss! Blocked by Guard." : "Requires at least 1 Power (You have 0)."}</span>
                  </div>
                </label>
              </div>
            </fieldset>

            <button type="submit" id="btn-strike" class="btn btn--primary btn--large" disabled>
              ${isSubmitting ? "Committing Strike..." : "⚔️ Declare Strike"}
            </button>
          </form>
        </div>

        <!-- Recover Option Card -->
        <div class="action-card action-card--recover ${!canRecover ? "action-card--disabled" : ""}">
          <div class="action-card__header">
            <h4>⚡ Recover Power</h4>
            <span class="action-card__badge">+1 Power</span>
          </div>
          <p class="action-card__desc">Gather your resources in the shadows. Increases your Power by 1 (up to 3 max) and passes your turn safely.</p>
          <div class="action-card__footer">
            <button type="button" id="btn-recover" class="btn btn--secondary btn--large" ${!canRecover || isSubmitting ? "disabled" : ""}>
              ${!canRecover ? "Power at Maximum (3)" : isSubmitting ? "Recovering..." : "⚡ Recover Power (+1)"}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
};
