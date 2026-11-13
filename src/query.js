import { CORPUS } from './corpus.js';
import { ENGINE_BY_ID, ENGINES } from './config.js';
import { normalizeQuery, pick } from './util.js';

export function buildSearchUrl(engineOrId, query) {
  const engine = typeof engineOrId === 'string' ? ENGINE_BY_ID[engineOrId] : engineOrId;
  if (!engine) throw new Error(`Unknown engine: ${engineOrId}`);

  const url = new URL(engine.searchUrl);
  url.searchParams.set(engine.queryParam, normalizeQuery(query));
  return url.toString();
}

export function getEnabledEngines(settings) {
  return ENGINES.filter((engine) => Boolean(settings.engines?.[engine.id]));
}

export function getAvailableEngines(settings, runtime, now = Date.now()) {
  return getEnabledEngines(settings).filter((engine) => {
    const health = runtime?.engineHealth?.[engine.id];
    return !health || !health.blockedUntil || health.blockedUntil <= now;
  });
}

export function selectEngine(settings, runtime, random = Math.random) {
  const available = getAvailableEngines(settings, runtime);
  return pick(available, random) || null;
}

export function nextEngineAvailableAt(settings, runtime, now = Date.now()) {
  const enabled = getEnabledEngines(settings);
  if (!enabled.length) return 0;

  const blockedUntil = enabled
    .map((engine) => runtime?.engineHealth?.[engine.id]?.blockedUntil || 0)
    .filter((value) => value > now);

  if (!blockedUntil.length) return now;
  return Math.min(...blockedUntil);
}

export function selectQuery(settings, recentQueries = [], random = Math.random, languageOverride = null) {
  const customWords = settings.customWordsEnabled && Array.isArray(settings.customWords)
    ? settings.customWords
    : [];

  const useCustom = customWords.length > 0 && random() * 100 < settings.customWeight;
  let pool;
  if (useCustom) {
    pool = customWords;
  } else {
    const requested = settings.language === 'auto'
      ? (languageOverride || 'en')
      : settings.language;
    if (requested === 'mix') {
      pool = Object.values(CORPUS).flat();
    } else {
      pool = CORPUS[requested] || CORPUS.en;
    }
  }

  if (!Array.isArray(pool) || pool.length === 0) return null;

  const recent = new Set(
    (Array.isArray(recentQueries) ? recentQueries : [])
      .map((query) => normalizeQuery(query).toLocaleLowerCase())
      .filter(Boolean)
  );

  const start = Math.floor(random() * pool.length);
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = normalizeQuery(pool[(start + offset) % pool.length]);
    if (candidate && !recent.has(candidate.toLocaleLowerCase())) {
      return candidate;
    }
  }

  return normalizeQuery(pool[start]) || null;
}

export function enabledEngineNames(settings) {
  return getEnabledEngines(settings).map((engine) => engine.name);
}
