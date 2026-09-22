import { t } from "../i18n/index.js";

export const renderRulesModal = (): string => {
  return `
    <div id="rules-modal" class="modal" hidden role="dialog" aria-labelledby="rules-modal-title" aria-modal="true">
      <div class="modal__backdrop" id="rules-backdrop"></div>
      <div class="modal__dialog max-w-2xl bg-neutral-900 border border-neutral-700 text-neutral-100 p-6 rounded-xl">
        <header class="modal__header flex justify-between items-center pb-3 border-b border-neutral-800">
          <h2 id="rules-modal-title" class="modal__title text-xl font-bold text-amber-300">${t("rules.title")}</h2>
          <button type="button" class="modal__close text-neutral-400 hover:text-white" id="rules-close" aria-label="${t("rules.closeAria")}">✕</button>
        </header>
        <div class="modal__body space-y-4 py-4 text-sm max-h-[70vh] overflow-y-auto">
          <section class="rule-block bg-neutral-950/50 p-3 rounded border border-neutral-800">
            <h3 class="font-bold text-neutral-200 mb-1">${t("rules.goalTitle")}</h3>
            <p class="text-neutral-300">${t("rules.goalDesc")}</p>
            <p class="text-amber-400 mt-1">${t("rules.powerPrivacyRule")}</p>
          </section>

          <section class="rule-block bg-neutral-950/50 p-3 rounded border border-neutral-800">
            <h3 class="font-bold text-neutral-200 mb-1">${t("rules.turnTitle")}</h3>
            <ul class="space-y-1 text-neutral-300">
              <li>${t("rules.recoverRule")}</li>
              <li>${t("rules.schemeRule")}</li>
              <li>${t("rules.strikeRule")}
                <ul class="ml-4 list-disc space-y-0.5 mt-1 text-xs text-neutral-400">
                  <li><strong>🎭 Bluff:</strong> ${t("rules.bluffSubRule")}</li>
                  <li><strong>🗡️ Genuine:</strong> ${t("rules.genuineSubRule")}</li>
                </ul>
              </li>
            </ul>
          </section>

          <section class="rule-block bg-neutral-950/50 p-3 rounded border border-neutral-800">
            <h3 class="font-bold text-neutral-200 mb-1">${t("rules.reactionTitle")}</h3>
            <p class="text-neutral-400 text-xs mb-2">${t("rules.reactionDesc")}</p>
            <div class="rule-table-wrapper overflow-x-auto">
              <table class="rule-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-neutral-700 bg-neutral-800/60">
                    <th class="p-2">${t("rules.tableHeaderReaction")}</th>
                    <th class="p-2">${t("rules.tableHeaderBluff")}</th>
                    <th class="p-2">${t("rules.tableHeaderGenuine")}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-800">
                  <tr>
                    <td class="p-2"><strong>${t("rules.tableGuardName")}</strong><br/><small class="text-neutral-400">${t("rules.tableGuardCost")}</small></td>
                    <td class="p-2">${t("rules.tableGuardBluff")}</td>
                    <td class="p-2">${t("rules.tableGuardGenuine")}</td>
                  </tr>
                  <tr>
                    <td class="p-2"><strong>${t("rules.tableChallengeName")}</strong><br/><small class="text-neutral-400">${t("rules.tableChallengeCost")}</small></td>
                    <td class="p-2 text-emerald-400">${t("rules.tableChallengeBluff")}</td>
                    <td class="p-2 text-red-400">${t("rules.tableChallengeGenuine")}</td>
                  </tr>
                  <tr>
                    <td class="p-2"><strong>${t("rules.tableYieldName")}</strong><br/><small class="text-neutral-400">${t("rules.tableYieldCost")}</small></td>
                    <td class="p-2">${t("rules.tableYieldBluff")}</td>
                    <td class="p-2">${t("rules.tableYieldGenuine")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <footer class="modal__footer pt-3 border-t border-neutral-800 text-right">
          <button type="button" class="btn btn--primary px-4 py-2 bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold rounded" id="rules-got-it">${t("rules.gotIt")}</button>
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
