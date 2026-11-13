import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_RUNTIME, DEFAULT_SETTINGS, ENGINES } from '../src/config.js';
import { sanitizeSettings } from '../src/settings.js';
import {
  computeNextRunAt,
  ensureDailyStats,
  shouldRun
} from '../src/scheduler.js';
import {
  isWithinActiveHours,
  MS,
  nextMidnight,
  todayKey
} from '../src/util.js';

function settings(overrides = {}) {
  return sanitizeSettings({ ...DEFAULT_SETTINGS, ...overrides });
}

function runtime(overrides = {}) {
  return {
    ...structuredClone(DEFAULT_RUNTIME),
    ...overrides,
    stats: {
      ...DEFAULT_RUNTIME.stats,
      ...(overrides.stats || {})
    },
    engineHealth: overrides.engineHealth || {}
  };
}

test('isWithinActiveHours supports daytime and overnight windows', () => {
  assert.equal(isWithinActiveHours({ enabled: true, start: 9, end: 17 }, new Date(2026, 0, 5, 10)), true);
  assert.equal(isWithinActiveHours({ enabled: true, start: 9, end: 17 }, new Date(2026, 0, 5, 18)), false);
  assert.equal(isWithinActiveHours({ enabled: true, start: 23, end: 7 }, new Date(2026, 0, 5, 2)), true);
  assert.equal(isWithinActiveHours({ enabled: true, start: 23, end: 7 }, new Date(2026, 0, 5, 12)), false);
  assert.equal(isWithinActiveHours({ enabled: true, start: 5, end: 5 }, new Date(2026, 0, 5, 12)), true);
  assert.equal(isWithinActiveHours({ enabled: false, start: 9, end: 17 }, new Date(2026, 0, 5, 23)), true);
});

test('ensureDailyStats resets counters on a new day', () => {
  const state = runtime({ stats: { date: '2000-01-01', attempts: 10, success: 9, errors: 1 } });
  const stats = ensureDailyStats(state, new Date(2026, 0, 5, 12).getTime());
  assert.equal(stats.date, todayKey(new Date(2026, 0, 5, 12)));
  assert.equal(stats.attempts, 0);
});

test('shouldRun reports disabled, paused, cap, no engine and cooling states', () => {
  const now = new Date(2026, 0, 5, 12).getTime();
  const base = settings({ engines: { google: true } });

  assert.equal(shouldRun(settings({ enabled: false }), runtime(), now).reason, 'disabled');
  const realNow = Date.now();
  assert.equal(shouldRun(settings({ ...base, pausedUntil: realNow + 60_000 }), runtime(), realNow).reason, 'paused');
  assert.equal(shouldRun(settings({ ...base, dailyCap: 2 }), runtime({ stats: { date: todayKey(new Date(now)), attempts: 2, success: 2, errors: 0 } }), now).reason, 'daily-cap');
  const allDisabled = Object.fromEntries(ENGINES.map((engine) => [engine.id, false]));
  assert.equal(shouldRun(settings({ ...base, engines: allDisabled }), runtime(), now).reason, 'no-engine');

  const onlyGoogle = settings({ ...base, engines: { ...allDisabled, google: true } });
  assert.equal(
    shouldRun(onlyGoogle, runtime({ engineHealth: { google: { blockedUntil: now + 60_000 } } }), now).reason,
    'cooling-down'
  );
  assert.equal(shouldRun(onlyGoogle, runtime(), now).ok, true);
});

test('computeNextRunAt returns zero when disabled', () => {
  assert.equal(computeNextRunAt(settings({ enabled: false }), runtime(), 1000), 0);
});

test('computeNextRunAt respects pause, daily cap and active hours', () => {
  const realNow = Date.now();
  const pauseUntil = realNow + 60_000;
  const paused = computeNextRunAt(settings({ pausedUntil: pauseUntil }), runtime(), realNow);
  assert.equal(paused, pauseUntil + 1000);

  const now = new Date(2026, 0, 5, 12).getTime();
  const capped = computeNextRunAt(
    settings({ dailyCap: 1 }),
    runtime({ stats: { date: todayKey(new Date(now)), attempts: 1, success: 1, errors: 0 } }),
    now
  );
  assert.ok(capped >= nextMidnight(new Date(now)));

  const outside = computeNextRunAt(
    settings({ activeHours: { enabled: true, start: 9, end: 10 } }),
    runtime(),
    now
  );
  assert.ok(outside > now);
});

test('computeNextRunAt uses interval with jitter in the normal case', () => {
  const now = new Date(2026, 0, 5, 12).getTime();
  const next = computeNextRunAt(
    settings({ intervalMinutes: 10, engines: { google: true } }),
    runtime(),
    now,
    () => 0.5
  );
  assert.equal(next, now + 10 * MS.minute);
});
