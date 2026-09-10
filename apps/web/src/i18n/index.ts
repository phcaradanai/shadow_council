import type {
  InterpolationParams,
  Locale,
  TranslationDictionary,
  TranslationKey,
} from "./types.js";
import { en } from "./locales/en.js";
import { th } from "./locales/th.js";

const STORAGE_KEY = "shadow-council.locale";
export const DEFAULT_LOCALE: Locale = "th";

const dictionaries: Record<Locale, TranslationDictionary> = {
  th,
  en,
};

let currentLocale: Locale = DEFAULT_LOCALE;

// Load persisted locale if in browser
try {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "th" || saved === "en") {
      currentLocale = saved;
    }
  }
} catch {
  // Storage unavailable; keep default
}

const listeners: Array<(locale: Locale) => void> = [];

export const getLocale = (): Locale => currentLocale;

export const setLocale = (locale: Locale): void => {
  if (locale !== "th" && locale !== "en") return;
  currentLocale = locale;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, locale);
    }
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale;
    }
  } catch {
    // Storage or DOM unavailable
  }
  for (const listener of listeners) {
    listener(currentLocale);
  }
};

export const subscribeLocale = (listener: (locale: Locale) => void): (() => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
};

export const t = (key: TranslationKey, params?: InterpolationParams): string => {
  const dict = dictionaries[currentLocale] ?? dictionaries[DEFAULT_LOCALE];
  let text = dict[key] ?? en[key] ?? key;

  if (params !== undefined) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      text = text.replaceAll(`{${paramKey}}`, String(paramValue));
    }
  }

  return text;
};

export const getLocalizedErrorMessage = (errorCode?: string, fallbackMessage?: string): string => {
  if (errorCode) {
    const candidateKey = `error.${errorCode}` as TranslationKey;
    const dict = dictionaries[currentLocale] ?? dictionaries[DEFAULT_LOCALE];
    if (candidateKey in dict) {
      return t(candidateKey);
    }
  }
  if (fallbackMessage && fallbackMessage !== "Request failed") {
    return fallbackMessage;
  }
  return t("error.generic");
};

export const renderLanguageSwitcher = (current: Locale): string => {
  return `
    <div class="lang-switch" role="group" aria-label="${t("common.language")}">
      <button
        type="button"
        class="btn btn--sm ${current === "th" ? "btn--primary active" : "btn--secondary"} lang-btn"
        data-lang="th"
        aria-pressed="${current === "th"}"
      >ไทย</button>
      <button
        type="button"
        class="btn btn--sm ${current === "en" ? "btn--primary active" : "btn--secondary"} lang-btn"
        data-lang="en"
        aria-pressed="${current === "en"}"
      >EN</button>
    </div>
  `;
};

export const attachLanguageSwitcherListeners = (root: HTMLElement): void => {
  root.querySelectorAll<HTMLButtonElement>(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetLang = btn.dataset.lang as Locale | undefined;
      if (targetLang === "th" || targetLang === "en") {
        setLocale(targetLang);
      }
    });
  });
};

export * from "./types.js";
