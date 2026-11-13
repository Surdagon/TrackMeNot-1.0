import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSearchUrl, selectEngine, selectQuery } from '../src/query.js';
import { CORPUS } from '../src/corpus.js';
import { parseCustomWords, serializeCustomWords } from '../src/util.js';
import { DEFAULT_SETTINGS } from '../src/config.js';
import { sanitizeSettings } from '../src/settings.js';

function settings(overrides = {}) {
  return sanitizeSettings({ ...DEFAULT_SETTINGS, ...overrides });
}

test('buildSearchUrl uses the engine query parameter and encodes the query', () => {
  const google = buildSearchUrl('google', 'привет мир');
  assert.equal(new URL(google).searchParams.get('q'), 'привет мир');
  assert.match(google, /^https:\/\/www\.google\.com\/search\?/);

  const yandex = buildSearchUrl('yandex', 'утренний кофе');
  assert.equal(new URL(yandex).searchParams.get('text'), 'утренний кофе');

  const startpage = buildSearchUrl('startpage', 'test query');
  assert.equal(new URL(startpage).searchParams.get('query'), 'test query');
});

test('selectQuery can use only custom words', () => {
  const query = selectQuery(settings({
    customWordsEnabled: true,
    customWeight: 100,
    customWords: ['моя фраза']
  }), [], () => 0);
  assert.equal(query, 'моя фраза');
});

test('selectQuery falls back to the built-in corpus at zero custom weight', () => {
  const query = selectQuery(settings({
    customWordsEnabled: true,
    customWeight: 0,
    customWords: ['моя фраза'],
    language: 'ru'
  }), [], () => 0);
  assert.ok(query);
  assert.notEqual(query, 'моя фраза');
});

test('every supported language has a usable corpus', () => {
  for (const [language, words] of Object.entries(CORPUS)) {
    assert.ok(Array.isArray(words), language);
    assert.ok(words.length >= 40, `${language}: ${words.length}`);
    assert.ok(words.every((word) => typeof word === 'string' && word.trim().length > 0), language);
  }
});

test('selectQuery auto follows the language override', () => {
  const query = selectQuery(settings({
    language: 'auto',
    customWordsEnabled: false
  }), [], () => 0, 'es');
  assert.ok(CORPUS.es.includes(query), query);
});

test('selectQuery mix can use any corpus', () => {
  const all = new Set(Object.values(CORPUS).flat());
  const query = selectQuery(settings({
    language: 'mix',
    customWordsEnabled: false
  }), [], () => 0.5);
  assert.ok(all.has(query), query);
});

test('selectQuery skips recently used queries', () => {
  const query = selectQuery(settings({
    customWordsEnabled: true,
    customWeight: 100,
    customWords: ['one', 'two']
  }), ['one'], () => 0);
  assert.equal(query, 'two');
});

test('selectEngine respects enabled flags and engine health', () => {
  const runtime = {
    engineHealth: {
      google: { blockedUntil: Date.now() + 60_000 }
    }
  };
  const selected = selectEngine(settings({
    engines: { google: true, bing: true }
  }), runtime, () => 0);
  assert.equal(selected.id, 'bing');

  const none = selectEngine(settings({
    engines: { google: false, bing: false }
  }), runtime, () => 0);
  assert.equal(none, null);
});

test('parseCustomWords handles UTF-8 BOM, comments, duplicates and limits', () => {
  const parsed = parseCustomWords('\uFEFF# comment\n\n  первая фраза  \nвторая фраза\nПЕРВАЯ ФРАЗА\n' + 'x'.repeat(201));
  assert.deepEqual(parsed.words, ['первая фраза', 'вторая фраза']);
  assert.equal(parsed.skipped, 2);
});

test('serializeCustomWords produces a re-importable text file', () => {
  const text = serializeCustomWords(['одна фраза', 'две фразы']);
  const parsed = parseCustomWords(text);
  assert.deepEqual(parsed.words, ['одна фраза', 'две фразы']);
  assert.match(text, /^# TrackMeNot Privacy/);
});
