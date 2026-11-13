import {
  DEFAULT_SETTINGS,
  ENGINES,
  LANGUAGES,
  LIMITS,
  SETTINGS_VERSION
} from './config.js';
import {
  clamp,
  deepMerge,
  normalizeQuery,
  parseCustomWords,
  safeNumber
} from './util.js';

export function mergeSettings(stored) {
  const source = stored && typeof stored === 'object' ? stored : {};
  const merged = deepMerge(DEFAULT_SETTINGS, source);

  merged.engines = { ...DEFAULT_SETTINGS.engines };
  if (source.engines && typeof source.engines === 'object') {
    for (const engine of ENGINES) {
      if (engine.id in source.engines) {
        merged.engines[engine.id] = Boolean(source.engines[engine.id]);
      }
    }
  }

  merged.activeHours = {
    ...DEFAULT_SETTINGS.activeHours,
    ...(source.activeHours && typeof source.activeHours === 'object'
      ? source.activeHours
      : {})
  };

  merged.customWords = Array.isArray(source.customWords)
    ? source.customWords.slice()
    : [];

  return merged;
}

export function sanitizeSettings(input) {
  const settings = mergeSettings(input);

  settings.version = SETTINGS_VERSION;
  settings.enabled = Boolean(settings.enabled);

  settings.engines = Object.fromEntries(
    ENGINES.map((engine) => [engine.id, Boolean(settings.engines?.[engine.id])])
  );

  settings.intervalMinutes = clamp(
    Math.round(safeNumber(settings.intervalMinutes, DEFAULT_SETTINGS.intervalMinutes)),
    LIMITS.minIntervalMinutes,
    LIMITS.maxIntervalMinutes
  );

  settings.dailyCap = clamp(
    Math.round(safeNumber(settings.dailyCap, DEFAULT_SETTINGS.dailyCap)),
    0,
    LIMITS.maxDailyCap
  );

  settings.activeHours = {
    enabled: Boolean(settings.activeHours?.enabled),
    start: clamp(Math.round(safeNumber(settings.activeHours?.start, 9)), 0, 23),
    end: clamp(Math.round(safeNumber(settings.activeHours?.end, 23)), 0, 23)
  };

  settings.customWordsEnabled = Boolean(settings.customWordsEnabled);
  settings.customWeight = clamp(
    Math.round(safeNumber(settings.customWeight, DEFAULT_SETTINGS.customWeight)),
    0,
    100
  );

  const parsed = parseCustomWords(
    Array.isArray(settings.customWords) ? settings.customWords.join('\n') : '',
    {
      maxWords: LIMITS.maxCustomWords,
      maxLength: LIMITS.maxCustomWordLength
    }
  );
  settings.customWords = parsed.words.map((word) => normalizeQuery(word)).filter(Boolean);

  settings.language = LANGUAGES.some((language) => language.id === settings.language)
    ? settings.language
    : DEFAULT_SETTINGS.language;

  settings.localOnly = Boolean(settings.localOnly);
  settings.loggingEnabled = Boolean(settings.loggingEnabled);
  settings.logQueries = Boolean(settings.logQueries);
  settings.maxLogEntries = clamp(
    Math.round(safeNumber(settings.maxLogEntries, DEFAULT_SETTINGS.maxLogEntries)),
    LIMITS.minLogEntries,
    LIMITS.maxLogEntries
  );
  settings.showBadge = Boolean(settings.showBadge);

  settings.pausedUntil = Math.max(0, Math.round(safeNumber(settings.pausedUntil, 0)));
  if (settings.pausedUntil && settings.pausedUntil <= Date.now()) {
    settings.pausedUntil = 0;
  }

  return settings;
}
