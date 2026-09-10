import { t } from "../i18n/index.js";

export const renderRulesModal = (): string => {
  return `
    <div id="rules-modal" class="modal" hidden role="dialog" aria-labelledby="rules-modal-title" aria-modal="true">
      <div class="modal__backdrop" id="rules-backdrop"></div>
      <div class="modal__dialog">
        <header class="modal__header">
          <h2 id="rules-modal-title" class="modal__title">${t("rules.title")}</h2>
          <button type="button" class="modal__close" id="rules-close" aria-label="${t("rules.closeAria")}">✕</button>
        </header>
        <div class="modal__body">
          <section class="rule-block">
            <h3>${t("rules.goalTitle")}</h3>
            <p>${t("rules.goalDesc")}</p>
            <p>${t("rules.powerPrivacyRule")}</p>
          </section>

          <section class="rule-block">
            <h3>${t("rules.turnTitle")}</h3>
            <ul>
              <li><strong>⚡ ${t("action.recoverTitle")}:</strong> ${t("rules.recoverRule")}</li>
              <li><strong>⚔️ ${t("action.strikeTitle")}:</strong> ${t("rules.strikeRule")}
                <ul>
                  <li><strong>🎭 ${t("action.bluffTitle")}:</strong> ${t("rules.bluffSubRule")}</li>
                  <li><strong>🗡️ ${t("action.genuineTitle")}:</strong> ${t("rules.genuineSubRule")}</li>
                </ul>
              </li>
            </ul>
          </section>

          <section class="rule-block">
            <h3>${t("rules.reactionTitle")}</h3>
            <p>${t("rules.reactionDesc")}</p>
            <div class="rule-table-wrapper">
              <table class="rule-table">
                <thead>
                  <tr>
                    <th>${t("rules.tableHeaderReaction")}</th>
                    <th>${t("rules.tableHeaderBluff")}</th>
                    <th>${t("rules.tableHeaderGenuine")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>${t("rules.tableGuardName")}</strong><br/><small>${t("rules.tableGuardCost")}</small></td>
                    <td>${t("rules.tableGuardBluff")}</td>
                    <td>${t("rules.tableGuardGenuine")}</td>
                  </tr>
                  <tr>
                    <td><strong>${t("rules.tableChallengeName")}</strong><br/><small>${t("rules.tableChallengeCost")}</small></td>
                    <td>${t("rules.tableChallengeBluff")}</td>
                    <td>${t("rules.tableChallengeGenuine")}</td>
                  </tr>
                  <tr>
                    <td><strong>${t("rules.tableYieldName")}</strong><br/><small>${t("rules.tableYieldCost")}</small></td>
                    <td>${t("rules.tableYieldBluff")}</td>
                    <td>${t("rules.tableYieldGenuine")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <footer class="modal__footer">
          <button type="button" class="btn btn--primary" id="rules-got-it">${t("rules.gotIt")}</button>
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
