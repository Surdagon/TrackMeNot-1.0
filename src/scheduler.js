import {
  addPositiveJitter,
  isWithinActiveHours,
  MS,
  nextActiveStart,
  nextMidnight,
  safeNumber,
  todayKey
} from './util.js';
import {
  getAvailableEngines,
  getEnabledEngines,
  nextEngineAvailableAt
} from './query.js';

export function ensureDailyStats(runtime, now = Date.now()) {
  const date = todayKey(new Date(now));
  if (!runtime.stats || runtime.stats.date !== date) {
    runtime.stats = {
      date,
      attempts: 0,
      success: 0,
      errors: 0
    };
  }
  return runtime.stats;
}

export function shouldRun(settings, runtime, now = Date.now()) {
  if (!settings.enabled) {
    return { ok: false, reason: 'disabled' };
  }
  if (settings.pausedUntil > now) {
    return { ok: false, reason: 'paused' };
  }

  ensureDailyStats(runtime, now);
  if (settings.dailyCap > 0 && runtime.stats.attempts >= settings.dailyCap) {
    return { ok: false, reason: 'daily-cap' };
  }

  if (!isWithinActiveHours(settings.activeHours, new Date(now))) {
    return { ok: false, reason: 'outside-hours' };
  }

  if (getEnabledEngines(settings).length === 0) {
    return { ok: false, reason: 'no-engine' };
  }

  if (getAvailableEngines(settings, runtime, now).length === 0) {
    return { ok: false, reason: 'cooling-down' };
  }

  return { ok: true, reason: 'ready' };
}

export function computeNextRunAt(settings, runtime, now = Date.now(), random = Math.random) {
  if (!settings.enabled) return 0;

  if (settings.pausedUntil > now) {
    return settings.pausedUntil + MS.second;
  }

  ensureDailyStats(runtime, now);

  if (settings.dailyCap > 0 && runtime.stats.attempts >= settings.dailyCap) {
    return addPositiveJitter(nextMidnight(new Date(now)), 5 * MS.minute, random);
  }

  if (!isWithinActiveHours(settings.activeHours, new Date(now))) {
    return addPositiveJitter(nextActiveStart(settings.activeHours, new Date(now)), MS.minute, random);
  }

  if (getEnabledEngines(settings).length === 0) {
    return now + MS.hour;
  }

  if (getAvailableEngines(settings, runtime, now).length === 0) {
    const next = nextEngineAvailableAt(settings, runtime, now);
    if (next > now) {
      return next + MS.second;
    }
    return now + MS.minute;
  }

  const base = Math.max(1, safeNumber(settings.intervalMinutes, 10)) * MS.minute;
  const factor = 0.8 + random() * 0.4;
  const delay = Math.max(30 * MS.second, base * factor);
  return now + Math.round(delay);
}
