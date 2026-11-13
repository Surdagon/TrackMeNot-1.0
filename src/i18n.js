import { UI_LANGUAGE_KEY } from './config.js';
import en from './locales/en.js';
import ru from './locales/ru.js';
import es from './locales/es.js';
import ptBR from './locales/pt-BR.js';
import fr from './locales/fr.js';
import de from './locales/de.js';
import it from './locales/it.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import zhCN from './locales/zh-CN.js';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-CN', label: '简体中文' }
];

const MESSAGES = {
  en,
  ru,
  es,
  'pt-BR': ptBR,
  fr,
  de,
  it,
  ja,
  ko,
  'zh-CN': zhCN
};

export const SUPPORTED_LANGUAGES = new Set(LANGUAGES.map((language) => language.code));
let currentLanguage = 'en';

export function normalizeLanguage(value) {
  const raw = String(value || '').replace(/_/g, '-').toLowerCase();
  if (!raw || raw === 'auto') return detectBrowserLanguage();
  if (raw.startsWith('pt')) return 'pt-BR';
  if (raw.startsWith('zh')) return 'zh-CN';
  if (raw.startsWith('ru')) return 'ru';
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('fr')) return 'fr';
  if (raw.startsWith('de')) return 'de';
  if (raw.startsWith('it')) return 'it';
  if (raw.startsWith('ja')) return 'ja';
  if (raw.startsWith('ko')) return 'ko';
  return 'en';
}

export function detectBrowserLanguage() {
  try {
    const language = chrome?.i18n?.getUILanguage?.()
      || globalThis.navigator?.language
      || 'en';
    return normalizeLanguage(language);
  } catch {
    return 'en';
  }
}

export async function resolveLanguage() {
  try {
    const data = await chrome.storage.local.get(UI_LANGUAGE_KEY);
    const stored = data[UI_LANGUAGE_KEY];
    if (stored && stored !== 'auto') return normalizeLanguage(stored);
    return detectBrowserLanguage();
  } catch {
    return detectBrowserLanguage();
  }
}

export async function setLanguage(value, persist = true) {
  const language = value === 'auto' ? detectBrowserLanguage() : normalizeLanguage(value);
  currentLanguage = language;
  if (persist) {
    try {
      await chrome.storage.local.set({ [UI_LANGUAGE_KEY]: value || language });
    } catch {
      // Storage may be unavailable in a plain page; the current session still works.
    }
  }
  return language;
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function t(key, vars = {}, language = currentLanguage) {
  const dictionary = MESSAGES[language] || MESSAGES.en;
  let text = dictionary[key] ?? MESSAGES.en[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

export function applyTranslations(root = document, language = currentLanguage) {
  currentLanguage = language;
  document.documentElement.lang = language;
  document.documentElement.dir = 'ltr';

  for (const element of root.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n, {}, language);
  }
  for (const element of root.querySelectorAll('[data-i18n-placeholder]')) {
    element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder, {}, language));
  }
  for (const element of root.querySelectorAll('[data-i18n-title]')) {
    element.setAttribute('title', t(element.dataset.i18nTitle, {}, language));
  }
  for (const element of root.querySelectorAll('[data-i18n-aria-label]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel, {}, language));
  }
}

export function formatDurationLocalized(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 60_000) {
    return t('durationSec', { n: Math.max(1, Math.round(ms / 1000)) });
  }
  if (ms < 3_600_000) {
    return t('durationMin', { n: Math.round(ms / 60_000) });
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return minutes
    ? t('durationHour', { h: hours, m: minutes })
    : t('durationHourShort', { h: hours });
}

export function getLanguageOptions() {
  return LANGUAGES.map((language) => ({ ...language }));
}
