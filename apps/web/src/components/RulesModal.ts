export const renderRulesModal = (): string => {
  return `
    <div id="rules-modal" class="modal" hidden role="dialog" aria-labelledby="rules-modal-title" aria-modal="true">
      <div class="modal__backdrop" id="rules-backdrop"></div>
      <div class="modal__dialog">
        <header class="modal__header">
          <h2 id="rules-modal-title" class="modal__title">📜 Shadow Council — Rules in 60 Seconds</h2>
          <button type="button" class="modal__close" id="rules-close" aria-label="Close rules">✕</button>
        </header>
        <div class="modal__body">
          <section class="rule-block">
            <h3>Goal of the Game</h3>
            <p>You begin with <strong>3 Influence</strong> and <strong>2 Power</strong>. If your Influence drops to 0, you are eliminated. <strong>The last surviving player wins!</strong></p>
          </section>

          <section class="rule-block">
            <h3>On Your Turn: Choose an Action</h3>
            <ul>
              <li><strong>⚡ Recover:</strong> Gain 1 Power (up to 3 max) and end your turn.</li>
              <li><strong>⚔️ Strike:</strong> Threaten a chosen living opponent. Privately choose your commitment:
                <ul>
                  <li><strong>🎭 Bluff (0 Power):</strong> Free threat. If they yield or guard, you deal damage without spending energy. But if Challenged, YOU lose 1 Influence!</li>
                  <li><strong>🗡️ Genuine (1 Power):</strong> Costs 1 Power. If they Challenge, they suffer a devastating <strong>2 Influence loss</strong>!</li>
                </ul>
              </li>
            </ul>
          </section>

          <section class="rule-block">
            <h3>Under Attack: Target's Reaction</h3>
            <p>The commitment is secret until you react. Choose wisely:</p>
            <div class="rule-table-wrapper">
              <table class="rule-table">
                <thead>
                  <tr>
                    <th>Reaction</th>
                    <th>If Attacker Bluffed (0 Power)</th>
                    <th>If Attacker Was Genuine (1 Power)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>🛡️ Guard</strong><br/><small>(Costs 1 Power)</small></td>
                    <td>Both safe. Target spent 1 Power.</td>
                    <td>Both safe. Both spent 1 Power.</td>
                  </tr>
                  <tr>
                    <td><strong>👁️ Challenge</strong><br/><small>(Free)</small></td>
                    <td><strong class="text-success">Bluff Caught!</strong> Attacker loses 1 Influence. Target unharmed.</td>
                    <td><strong class="text-danger">Counter-Strike!</strong> Target loses <strong>2 Influence</strong>!</td>
                  </tr>
                  <tr>
                    <td><strong>🏳️ Yield</strong><br/><small>(Free)</small></td>
                    <td>Target loses 1 Influence. Attacker spent 0.</td>
                    <td>Target loses 1 Influence. Attacker spent 1.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <footer class="modal__footer">
          <button type="button" class="btn btn--primary" id="rules-got-it">Got it, let's play</button>
        </footer>
      </div>
    </div>
  `;
};

export const attachRulesModalListeners = (root: HTMLElement): void => {
  const modal = root.querySelector<HTMLElement>("#rules-modal");
  const openBtn = root.querySelector<HTMLButtonElement>("#btn-rules-open");
  const closeBtn = root.querySelector<HTMLButtonElement>("#rules-close");
  const gotItBtn = root.querySelector<HTMLButtonElement>("#rules-got-it");
  const backdrop = root.querySelector<HTMLElement>("#rules-backdrop");

  const open = () => {
    if (modal) modal.hidden = false;
  };
  const close = () => {
    if (modal) modal.hidden = true;
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  gotItBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
};
