import { t } from "../i18n/index.js";

export const renderCountdown = (deadlineAt?: number): string => {
  if (deadlineAt === undefined) return "";
  const remainingMs = Math.max(0, deadlineAt - Date.now());
  const seconds = Math.ceil(remainingMs / 1000);
  const urgentClass = seconds <= 5 ? "countdown--urgent" : "";

  return `
    <div class="countdown ${urgentClass}" data-deadline="${deadlineAt}" aria-live="off" role="timer" aria-label="${seconds} seconds remaining">
      <div class="countdown__indicator">
        <span class="countdown__icon">⏳</span>
        <span class="countdown__text">${t("game.countdownRemaining")}: <strong class="countdown__seconds">${seconds}s</strong></span>
      </div>
      <div class="countdown__bar-bg">
        <div class="countdown__bar-fill" style="width: ${Math.min(100, (seconds / 45) * 100)}%;"></div>
      </div>
    </div>
  `;
};

export const startCountdownTicker = (container: HTMLElement): (() => void) => {
  const el = container.querySelector<HTMLElement>(".countdown");
  if (!el) return () => {};
  const deadlineStr = el.dataset.deadline;
  if (!deadlineStr) return () => {};
  const deadlineAt = Number(deadlineStr);
  const secondsEl = el.querySelector<HTMLElement>(".countdown__seconds");
  const fillEl = el.querySelector<HTMLElement>(".countdown__bar-fill");

  const interval = setInterval(() => {
    const remainingMs = Math.max(0, deadlineAt - Date.now());
    const seconds = Math.ceil(remainingMs / 1000);
    if (secondsEl) secondsEl.textContent = `${seconds}s`;
    if (fillEl) fillEl.style.width = `${Math.min(100, (seconds / 45) * 100)}%`;
    if (seconds <= 5) {
      el.classList.add("countdown--urgent");
    }
    if (remainingMs <= 0) {
      clearInterval(interval);
    }
  }, 500);

  return () => clearInterval(interval);
};
