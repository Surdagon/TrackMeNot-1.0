import {
  ALARM_NAME,
  DEFAULT_RUNTIME,
  DEFAULT_SETTINGS,
  ENGINES,
  LIMITS,
  LOG_KEY,
  RUNTIME_KEY,
  SETTINGS_KEY,
  UI_LANGUAGE_KEY
} from './src/config.js';
import {
  clearAllData,
  loadState,
  normalizeRuntime,
  writeLog,
  writeRuntime,
  writeSettings
} from './src/storage.js';
import { sanitizeSettings } from './src/settings.js';
import {
  buildSearchUrl,
  getEnabledEngines,
  selectEngine,
  selectQuery
} from './src/query.js';
import {
  computeNextRunAt,
  ensureDailyStats,
  shouldRun
} from './src/scheduler.js';
import {
  clone,
  formatDateTime,
  todayKey
} from './src/util.js';
import { normalizeLanguage } from './src/i18n.js';

const state = {
  settings: null,
  runtime: null,
  log: [],
  uiLanguage: 'auto'
};

let running = false;

function hasState() {
  return Boolean(state.settings && state.runtime);
}

async function load() {
  const loaded = await loadState();
  state.settings = sanitizeSettings(loaded.settings);
  state.runtime = loaded.runtime;
  state.log = Array.isArray(loaded.log) ? loaded.log : [];
  state.uiLanguage = loaded.uiLanguage || 'auto';
  ensureDailyStats(state.runtime, Date.now());
  return state;
}

function resolveQueryLanguage() {
  const preference = state.uiLanguage && state.uiLanguage !== 'auto'
    ? state.uiLanguage
    : (chrome.i18n?.getUILanguage?.() || 'en');
  return normalizeLanguage(preference);
}

async function persistRuntime() {
  state.runtime = await writeRuntime(state.runtime);
}

async function updateBadge() {
  if (!hasState()) return;
  try {
    const { settings, runtime } = state;
    if (!settings.showBadge) {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'TrackMeNot Privacy' });
      return;
    }

    if (!settings.enabled) {
      await chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setTitle({ title: 'TrackMeNot Privacy: выключено' });
      return;
    }

    if (settings.pausedUntil > Date.now()) {
      await chrome.action.setBadgeBackgroundColor({ color: '#d97706' });
      await chrome.action.setBadgeText({ text: 'II' });
      await chrome.action.setTitle({
        title: `TrackMeNot Privacy: пауза до ${formatDateTime(settings.pausedUntil)}`
      });
      return;
    }

    if (runtime.lastResult && runtime.lastResult.ok === false) {
      await chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setTitle({
        title: `TrackMeNot Privacy: ошибка — ${runtime.lastResult.reason || 'см. настройки'}`
      });
      return;
    }

    await chrome.action.setBadgeBackgroundColor({ color: '#0f766e' });
    await chrome.action.setBadgeText({ text: 'ON' });
    await chrome.action.setTitle({ title: 'TrackMeNot Privacy: включено' });
  } catch (error) {
    console.warn('badge update failed', error);
  }
}

async function scheduleNext(reason = '') {
  if (!hasState()) await load();

  const now = Date.now();
  ensureDailyStats(state.runtime, now);

  let nextRunAt = computeNextRunAt(state.settings, state.runtime, now);
  if (nextRunAt > 0) {
    nextRunAt = Math.max(nextRunAt, now + 30 * 1000);
  }

  state.runtime.nextRunAt = nextRunAt;
  state.runtime.lastScheduleReason = reason;

  await persistRuntime();
  await chrome.alarms.clear(ALARM_NAME);
  if (nextRunAt > 0) {
    await chrome.alarms.create(ALARM_NAME, { when: nextRunAt });
  }
  await updateBadge();
}

function recordEngineHealth(engineId, outcome, now = Date.now()) {
  const health = state.runtime.engineHealth[engineId] || {
    failures: 0,
    blockedUntil: 0
  };

  if (outcome.ok) {
    health.failures = 0;
    health.blockedUntil = 0;
  } else {
    health.failures = Math.max(0, Number(health.failures) || 0) + 1;
    const blocked = outcome.reason === 'blocked'
      || outcome.status === 403
      || outcome.status === 429
      || outcome.status === 503;
    const base = blocked ? 5 * 60 * 1000 : 2 * 60 * 1000;
    const backoff = base * (2 ** Math.min(5, Math.max(0, health.failures - 1)));
    health.blockedUntil = now + Math.min(6 * 60 * 60 * 1000, backoff);
  }

  health.lastStatus = Number(outcome.status) || 0;
  health.lastAt = now;
  health.lastReason = outcome.reason || '';
  state.runtime.engineHealth[engineId] = health;
}

function classifyResponse(response, pagePeek = '') {
  if (response.type === 'opaque') {
    return { ok: false, status: 0, reason: 'opaque-response' };
  }

  const signature = `${response.url || ''}\n${pagePeek}`.toLowerCase();
  if (
    response.status === 403
    || response.status === 429
    || response.status === 503
    || /captcha|unusual traffic|before you continue|verify you are human|access denied|too many requests|consent\.google|consent\.yandex|\/sorry\/|challenge/.test(signature)
  ) {
    return { ok: false, status: response.status, reason: 'blocked' };
  }

  if (response.status >= 200 && response.status < 400) {
    return { ok: true, status: response.status, reason: 'ok' };
  }

  return { ok: false, status: response.status, reason: 'http-error' };
}

async function performSearch(trigger = 'alarm', options = {}) {
  if (!hasState()) await load();

  const settings = state.settings;
  const runtime = state.runtime;
  const now = Date.now();
  ensureDailyStats(runtime, now);

  if (!settings.enabled) {
    return { ok: false, skipped: true, reason: 'disabled' };
  }

  if (!options.ignoreSchedule) {
    const check = shouldRun(settings, runtime, now);
    if (!check.ok) {
      return { ok: false, skipped: true, reason: check.reason };
    }
  }

  const engine = selectEngine(settings, runtime);
  if (!engine) {
    const reason = getEnabledEngines(settings).length ? 'cooling-down' : 'no-engine';
    return { ok: false, skipped: true, reason };
  }

  const query = selectQuery(settings, runtime.recentQueries, Math.random, resolveQueryLanguage());
  if (!query) {
    return { ok: false, skipped: true, reason: 'no-query' };
  }

  const startedAt = Date.now();
  runtime.stats.attempts += 1;

  let outcome;
  let queryUrl = '';

  if (settings.localOnly) {
    outcome = { ok: true, status: 0, reason: 'local-only' };
  } else {
    queryUrl = buildSearchUrl(engine, query);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LIMITS.requestTimeoutMs);

    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        redirect: 'follow',
        signal: controller.signal
      });
      // Do not consume the response body: it costs bandwidth and can keep
      // the service-worker request stream open. Status + final URL are enough
      // for health/backoff decisions.
      outcome = classifyResponse(response, '');
    } catch (error) {
      outcome = {
        ok: false,
        status: 0,
        reason: error?.name === 'AbortError' || error?.name === 'TimeoutError' ? 'timeout' : 'network-error'
      };
    } finally {
      clearTimeout(timeout);
    }

    recordEngineHealth(engine.id, outcome, now);
  }

  const durationMs = Date.now() - startedAt;
  if (outcome.ok) {
    runtime.stats.success += 1;
  } else {
    runtime.stats.errors += 1;
  }

  runtime.lastResult = {
    at: new Date(now).toISOString(),
    engineId: engine.id,
    engineName: engine.name,
    status: outcome.status,
    ok: outcome.ok,
    reason: outcome.reason,
    durationMs
  };
  runtime.recentQueries = [...runtime.recentQueries, query].slice(-20);

  await persistRuntime();

  if (settings.loggingEnabled) {
    const entry = {
      at: new Date(now).toISOString(),
      engineId: engine.id,
      engineName: engine.name,
      ok: outcome.ok,
      status: outcome.status,
      reason: outcome.reason,
      durationMs,
      mode: settings.localOnly ? 'local' : 'network',
      trigger
    };
    if (settings.logQueries) entry.query = query;

    state.log.unshift(entry);
    state.log = state.log.slice(0, settings.maxLogEntries);
    try {
      await writeLog(state.log);
    } catch (error) {
      console.warn('log write failed', error);
    }
  }

  await updateBadge();

  return {
    ok: outcome.ok,
    status: outcome.status,
    reason: outcome.reason,
    engineId: engine.id,
    engineName: engine.name,
    query,
    durationMs,
    url: settings.logQueries ? queryUrl : undefined
  };
}

async function runManual() {
  if (running) {
    return { ok: false, reason: 'busy' };
  }

  if (!hasState()) await load();

  const now = Date.now();
  if (now - (state.runtime.lastManualRun || 0) < 60 * 1000) {
    return { ok: false, reason: 'rate-limited' };
  }
  if (!state.settings.enabled) {
    return { ok: false, reason: 'disabled' };
  }

  state.runtime.lastManualRun = now;
  await persistRuntime();

  running = true;
  try {
    const result = await performSearch('manual', { ignoreSchedule: true });
    return result;
  } finally {
    running = false;
    try {
      await scheduleNext('manual');
    } catch (error) {
      console.error('TrackMeNot: manual reschedule failed', error);
    }
  }
}

async function handleAlarm() {
  if (running) return;
  running = true;
  try {
    if (!hasState()) await load();
    const result = await performSearch('alarm');
    if (result.skipped) {
      console.info('TrackMeNot: search skipped:', result.reason);
    }
  } catch (error) {
    console.error('TrackMeNot: alarm handler failed', error);
  } finally {
    running = false;
    try {
      await scheduleNext('after-alarm');
    } catch (error) {
      console.error('TrackMeNot: reschedule failed', error);
    }
  }
}

async function getStatus() {
  if (!hasState()) await load();
  ensureDailyStats(state.runtime, Date.now());

  const settings = state.settings;

  // A popup can open before the install/startup handler has armed the timer.
  // In that case, arm it now so the first status response is useful.
  if (settings.enabled && (!state.runtime.nextRunAt || state.runtime.nextRunAt <= 0)) {
    await scheduleNext('status-boot');
  }
  const runtime = state.runtime;

  return {
    settings: {
      enabled: settings.enabled,
      pausedUntil: settings.pausedUntil,
      intervalMinutes: settings.intervalMinutes,
      dailyCap: settings.dailyCap,
      activeHours: settings.activeHours,
      customWordsEnabled: settings.customWordsEnabled,
      customWeight: settings.customWeight,
      customWordsCount: settings.customWords.length,
      language: settings.language,
      localOnly: settings.localOnly,
      loggingEnabled: settings.loggingEnabled,
      logQueries: settings.logQueries,
      maxLogEntries: settings.maxLogEntries,
      showBadge: settings.showBadge
    },
    runtime: {
      nextRunAt: runtime.nextRunAt,
      stats: runtime.stats,
      lastResult: runtime.lastResult,
      engineHealth: runtime.engineHealth
    },
    engines: ENGINES.map((engine) => ({
      id: engine.id,
      name: engine.name,
      host: engine.host,
      enabled: Boolean(settings.engines[engine.id]),
      health: runtime.engineHealth[engine.id] || null
    })),
    logCount: state.log.length
  };
}

async function resetAll() {
  await clearAllData();
  const settings = sanitizeSettings(clone(DEFAULT_SETTINGS));
  const runtime = clone(DEFAULT_RUNTIME);
  runtime.stats.date = todayKey();
  state.settings = settings;
  state.runtime = runtime;
  state.log = [];
  state.uiLanguage = 'auto';
  await writeSettings(settings);
  await writeRuntime(runtime);
  await writeLog([]);
  await scheduleNext('reset');
  return { ok: true };
}

chrome.runtime.onInstalled.addListener((details) => {
  void (async () => {
    try {
      if (!hasState()) await load();
      if (details.reason === 'install') {
        await writeSettings(state.settings);
        await writeRuntime(state.runtime);
        await writeLog([]);
      }
      await scheduleNext(`installed:${details.reason}`);
    } catch (error) {
      console.error('TrackMeNot: install handler failed', error);
    }
  })();
});

chrome.runtime.onStartup.addListener(() => {
  void (async () => {
    try {
      if (!hasState()) await load();
      await scheduleNext('startup');
    } catch (error) {
      console.error('TrackMeNot: startup handler failed', error);
    }
  })();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  void handleAlarm();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return false;
  if (sender?.id && sender.id !== chrome.runtime.id) return false;

  if (message.type === 'getStatus') {
    getStatus()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'runNow') {
    runManual()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'resetAll') {
    resetAll()
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  if (message.type === 'reschedule') {
    scheduleNext('message')
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: String(error) }));
    return true;
  }

  return false;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  if (changes[SETTINGS_KEY]?.newValue) {
    state.settings = sanitizeSettings(changes[SETTINGS_KEY].newValue);
    if (!state.runtime) state.runtime = clone(DEFAULT_RUNTIME);
    ensureDailyStats(state.runtime, Date.now());
    void updateBadge();
    if (!running) {
      void scheduleNext('settings-changed').catch((error) => {
        console.error('TrackMeNot: reschedule after settings change failed', error);
      });
    }
  }

  if (changes[RUNTIME_KEY]?.newValue && !running) {
    state.runtime = normalizeRuntime(changes[RUNTIME_KEY].newValue);
    void updateBadge();
  }

  if (changes[LOG_KEY]) {
    state.log = Array.isArray(changes[LOG_KEY].newValue) ? changes[LOG_KEY].newValue : [];
  }

  if (changes[UI_LANGUAGE_KEY]) {
    state.uiLanguage = changes[UI_LANGUAGE_KEY].newValue || 'auto';
  }
});

// Keep a useful, privacy-safe log available for the options page.
void (async () => {
  try {
    const alarm = await chrome.alarms.get(ALARM_NAME);
    if (!alarm) {
      await load();
      if (state.settings.enabled) {
        await scheduleNext('worker-boot');
      } else {
        await updateBadge();
      }
    }
  } catch (error) {
    console.warn('TrackMeNot: boot check failed', error);
  }
})();
