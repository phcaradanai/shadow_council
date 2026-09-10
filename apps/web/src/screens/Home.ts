import { sounds } from "../presentation/sound.js";
import { renderRulesModal, attachRulesModalListeners } from "../components/RulesModal.js";

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
          <h1 class="app-title">SHADOW COUNCIL</h1>
          <p class="app-subtitle">A Social Bluff & Deduction Game of Concealed Strikes</p>
        </div>
        <div class="app-header__actions">
          <button type="button" class="btn btn--icon" id="btn-sound-toggle" aria-label="${isMuted ? "Unmute sound" : "Mute sound"}">
            ${isMuted ? "🔇" : "🔊"}
          </button>
          <button type="button" class="btn btn--secondary btn--sm" id="btn-rules-open">
            📜 How to Play
          </button>
        </div>
      </header>

      ${errorMessage ? `<div class="alert alert--error" role="alert"><span class="alert__icon">⚠️</span> ${escapeHtml(errorMessage)}</div>` : ""}

      <main class="home-grid">
        <!-- Create Room Card -->
        <section class="card home-card">
          <h2 class="card__title">Create a Council</h2>
          <p class="card__desc">Start a new private match room as host. Share the room code with friends.</p>
          <form id="form-create" class="form-vertical">
            <div class="form-group">
              <label for="create-name" class="form-label">Your Display Name</label>
              <input
                id="create-name"
                name="name"
                type="text"
                class="form-input"
                placeholder="e.g. Master Corvus"
                required
                maxlength="32"
                autofocus
                ${isSubmitting ? "disabled" : ""}
              />
            </div>
            <button type="submit" class="btn btn--primary btn--block" ${isSubmitting ? "disabled" : ""}>
              ${isSubmitting ? "Creating..." : "Create Room"}
            </button>
          </form>
        </section>

        <!-- Join Room Card -->
        <section class="card home-card">
          <h2 class="card__title">Join a Council</h2>
          <p class="card__desc">Enter a room code provided by your match host to take your seat.</p>
          <form id="form-join" class="form-vertical">
            <div class="form-group">
              <label for="join-code" class="form-label">Room Code</label>
              <input
                id="join-code"
                name="code"
                type="text"
                class="form-input form-input--code"
                placeholder="e.g. AB12CD"
                required
                maxlength="16"
                ${isSubmitting ? "disabled" : ""}
              />
            </div>
            <div class="form-group">
              <label for="join-name" class="form-label">Your Display Name</label>
              <input
                id="join-name"
                name="name"
                type="text"
                class="form-input"
                placeholder="e.g. Lady Vespera"
                required
                maxlength="32"
                ${isSubmitting ? "disabled" : ""}
              />
            </div>
            <button type="submit" class="btn btn--secondary btn--block" ${isSubmitting ? "disabled" : ""}>
              ${isSubmitting ? "Joining..." : "Join Room"}
            </button>
          </form>
        </section>
      </main>

      <section class="home-quick-rules">
        <h3 class="quick-rules__title">Quick Summary</h3>
        <div class="quick-rules__grid">
          <div class="quick-rule-item">
            <span class="quick-rule-item__icon">🎭</span>
            <strong>Bluff or Attack</strong>
            <p>Declare a Strike against an opponent. Spend 1 Power on a genuine blow, or pay 0 to bluff!</p>
          </div>
          <div class="quick-rule-item">
            <span class="quick-rule-item__icon">🛡️</span>
            <strong>Tactical Reactions</strong>
            <p>Target can Guard (1 Power), Challenge the bluff (free), or Yield (free, -1 Inf).</p>
          </div>
          <div class="quick-rule-item">
            <span class="quick-rule-item__icon">👑</span>
            <strong>Last One Standing</strong>
            <p>Start with 3 Influence. Zero influence eliminates you. Sole survivor takes the Council!</p>
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
