import { sounds } from "../presentation/sound.js";
import { renderRulesModal, attachRulesModalListeners } from "../components/RulesModal.js";
import { t, getLocale, renderLanguageSwitcher, getLocalizedErrorMessage } from "../i18n/index.js";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export interface HomeCallbacks {
  onCreateRoom: (displayName: string) => void;
  onJoinRoom: (roomCode: string, displayName: string) => void;
}

export const renderHomeScreen = (
  container: HTMLElement,
  callbacks: HomeCallbacks,
  errorMessage?: string,
  isSubmitting = false,
): void => {
  const isMuted = sounds.isMuted();

  container.innerHTML = `
    <div class="screen screen--home">
      <header class="app-header">
        <div class="app-header__brand">
          <h1 class="app-title">${t("common.title")}</h1>
          <p class="app-subtitle">${t("common.subtitle")}</p>
        </div>
        <div class="app-header__actions">
          ${renderLanguageSwitcher(getLocale())}
          <button type="button" class="btn btn--icon" id="btn-sound-toggle" aria-label="${isMuted ? t("common.soundUnmute") : t("common.soundMute")}">
            ${isMuted ? "🔇" : "🔊"}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-rules-open">
            📜 ${t("common.rules")}
          </button>
        </div>
      </header>

      ${errorMessage ? `<div class="alert alert--error" role="alert"><span class="alert__icon">⚠️</span> ${escapeHtml(getLocalizedErrorMessage(errorMessage))}</div>` : ""}

      <main class="home-grid">
        <!-- Create Room Card -->
        <section class="card home-card">
          <h2 class="card__title">${t("home.createTitle")}</h2>
          <p class="card__desc">${t("home.createDesc")}</p>
          <form id="form-create" class="form-vertical">
            <div class="form-group">
              <label for="create-name" class="form-label">${t("home.createNameLabel")}</label>
              <input
                id="create-name"
                name="name"
                type="text"
                class="form-input"
                placeholder="${t("home.createNamePlaceholder")}"
                required
                maxlength="32"
                autofocus
                ${isSubmitting ? "disabled" : ""}
              />
            </div>
            <button type="submit" class="btn btn--primary btn--block" ${isSubmitting ? "disabled" : ""}>
              ${isSubmitting ? t("home.creatingButton") : t("home.createButton")}
            </button>
          </form>
        </section>

        <!-- Join Room Card -->
        <section class="card home-card">
          <h2 class="card__title">${t("home.joinTitle")}</h2>
          <p class="card__desc">${t("home.joinDesc")}</p>
          <form id="form-join" class="form-vertical">
            <div class="form-group">
              <label for="join-code" class="form-label">${t("home.joinCodeLabel")}</label>
              <input
                id="join-code"
                name="code"
                type="text"
                class="form-input form-input--code"
                placeholder="${t("home.joinCodePlaceholder")}"
                required
                maxlength="16"
                ${isSubmitting ? "disabled" : ""}
              />
            </div>
            <div class="form-group">
              <label for="join-name" class="form-label">${t("home.joinNameLabel")}</label>
              <input
                id="join-name"
                name="name"
                type="text"
                class="form-input"
                placeholder="${t("home.joinNamePlaceholder")}"
                required
                maxlength="32"
                ${isSubmitting ? "disabled" : ""}
              />
            </div>
            <button type="submit" class="btn btn--secondary btn--block" ${isSubmitting ? "disabled" : ""}>
              ${isSubmitting ? t("home.joiningButton") : t("home.joinButton")}
            </button>
          </form>
        </section>
      </main>

      <section class="home-quick-rules">
        <h3 class="quick-rules__title">${t("home.quickSummaryTitle")}</h3>
        <div class="quick-rules__grid">
          <div class="quick-rule-item">
            <span class="quick-rule-item__icon">🎭</span>
            <strong>${t("home.quickBluffTitle")}</strong>
            <p>${t("home.quickBluffDesc")}</p>
          </div>
          <div class="quick-rule-item">
            <span class="quick-rule-item__icon">🛡️</span>
            <strong>${t("home.quickReactionTitle")}</strong>
            <p>${t("home.quickReactionDesc")}</p>
          </div>
          <div class="quick-rule-item">
            <span class="quick-rule-item__icon">👑</span>
            <strong>${t("home.quickSurvivorTitle")}</strong>
            <p>${t("home.quickSurvivorDesc")}</p>
          </div>
        </div>
      </section>

      ${renderRulesModal()}
    </div>
  `;

  // Attach listeners
  attachRulesModalListeners(container);

  container.querySelector<HTMLButtonElement>("#btn-sound-toggle")?.addEventListener("click", () => {
    sounds.click();
    sounds.toggleMute();
    renderHomeScreen(container, callbacks, errorMessage, isSubmitting);
  });

  container.querySelector<HTMLFormElement>("#form-create")?.addEventListener("submit", (e) => {
    e.preventDefault();
    sounds.click();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const name = String(fd.get("name") ?? "").trim();
    if (name) callbacks.onCreateRoom(name);
  });

  container.querySelector<HTMLFormElement>("#form-join")?.addEventListener("submit", (e) => {
    e.preventDefault();
    sounds.click();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const code = String(fd.get("code") ?? "")
      .trim()
      .toUpperCase();
    const name = String(fd.get("name") ?? "").trim();
    if (code && name) callbacks.onJoinRoom(code, name);
  });
};
