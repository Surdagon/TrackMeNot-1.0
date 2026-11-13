import {
  DEFAULT_RUNTIME,
  LOG_KEY,
  RUNTIME_KEY,
  SETTINGS_KEY,
  UI_LANGUAGE_KEY
} from './config.js';
import { mergeSettings, sanitizeSettings } from './settings.js';
import { clone } from './util.js';

export function normalizeRuntime(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...clone(DEFAULT_RUNTIME),
    ...source,
    stats: {
      ...DEFAULT_RUNTIME.stats,
      ...(source.stats && typeof source.stats === 'object' ? source.stats : {})
    },
    engineHealth: source.engineHealth && typeof source.engineHealth === 'object'
      ? source.engineHealth
      : {},
    recentQueries: Array.isArray(source.recentQueries)
      ? source.recentQueries.slice(-20)
      : []
  };
}

export async function readSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return sanitizeSettings(mergeSettings(data[SETTINGS_KEY] || {}));
}

export async function writeSettings(settings) {
  const clean = sanitizeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_KEY]: clean });
  return clean;
}

export async function readRuntime() {
  const data = await chrome.storage.local.get(RUNTIME_KEY);
  return normalizeRuntime(data[RUNTIME_KEY]);
}

export async function writeRuntime(runtime) {
  const clean = normalizeRuntime(runtime);
  await chrome.storage.local.set({ [RUNTIME_KEY]: clean });
  return clean;
}

export async function readLog() {
  const data = await chrome.storage.local.get(LOG_KEY);
  return Array.isArray(data[LOG_KEY]) ? data[LOG_KEY] : [];
}

export async function writeLog(entries) {
  const list = Array.isArray(entries) ? entries : [];
  await chrome.storage.local.set({ [LOG_KEY]: list });
  return list;
}

export async function appendLog(entry, maxEntries = 200) {
  const log = await readLog();
  log.unshift(entry);
  const limit = Math.max(1, Math.round(Number(maxEntries) || 200));
  return writeLog(log.slice(0, limit));
}

export async function clearLog() {
  await chrome.storage.local.remove(LOG_KEY);
}

export async function clearAllData() {
  await chrome.storage.local.clear();
}

export async function loadState() {
  const [settings, runtime, log, uiLanguage] = await Promise.all([
    readSettings(),
    readRuntime(),
    readLog(),
    chrome.storage.local.get(UI_LANGUAGE_KEY)
  ]);
  return {
    settings,
    runtime,
    log,
    uiLanguage: uiLanguage[UI_LANGUAGE_KEY] || 'auto'
  };
}
