import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_SETTINGS } from '../src/config.js';
import { mergeSettings, sanitizeSettings } from '../src/settings.js';

test('the default corpus language follows the interface language', () => {
  assert.equal(sanitizeSettings(DEFAULT_SETTINGS).language, 'auto');
});

test('click mode is off by default and can be enabled explicitly', () => {
  assert.equal(sanitizeSettings(DEFAULT_SETTINGS).simulateClicks, false);
  assert.equal(sanitizeSettings({ ...DEFAULT_SETTINGS, simulateClicks: true }).simulateClicks, true);
});

test('sanitizeSettings clamps numeric ranges', () => {
  const settings = sanitizeSettings({
    ...DEFAULT_SETTINGS,
    intervalMinutes: 0,
    dailyCap: 999999,
    customWeight: 500,
    maxLogEntries: 1,
    activeHours: { enabled: true, start: 99, end: -5 }
  });

  assert.equal(settings.intervalMinutes, 1);
  assert.equal(settings.dailyCap, 5000);
  assert.equal(settings.customWeight, 100);
  assert.equal(settings.maxLogEntries, 10);
  assert.equal(settings.activeHours.start, 23);
  assert.equal(settings.activeHours.end, 0);
});

test('sanitizeSettings deduplicates custom words and strips empties', () => {
  const settings = sanitizeSettings({
    ...DEFAULT_SETTINGS,
    customWords: ['  одна фраза ', 'ОДНА ФРАЗА', '', 'вторая фраза']
  });
  assert.deepEqual(settings.customWords, ['одна фраза', 'вторая фраза']);
});

test('mergeSettings keeps defaults for missing nested fields', () => {
  const merged = mergeSettings({ enabled: false, activeHours: { start: 7 } });
  assert.equal(merged.enabled, false);
  assert.equal(merged.activeHours.start, 7);
  assert.equal(merged.activeHours.end, DEFAULT_SETTINGS.activeHours.end);
  assert.equal(merged.engines.google, DEFAULT_SETTINGS.engines.google);
});
