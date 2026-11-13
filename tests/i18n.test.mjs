import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LANGUAGES,
  normalizeLanguage,
  setLanguage,
  t
} from '../src/i18n.js';

test('normalizeLanguage maps browser locale variants', () => {
  assert.equal(normalizeLanguage('ru-RU'), 'ru');
  assert.equal(normalizeLanguage('pt_BR'), 'pt-BR');
  assert.equal(normalizeLanguage('pt-PT'), 'pt-BR');
  assert.equal(normalizeLanguage('zh-CN'), 'zh-CN');
  assert.equal(normalizeLanguage('zh-TW'), 'zh-CN');
  assert.equal(normalizeLanguage('de-AT'), 'de');
  assert.equal(normalizeLanguage('unknown'), 'en');
});

test('all 10 languages have the core strings', () => {
  assert.equal(LANGUAGES.length, 10);
  for (const language of LANGUAGES) {
    for (const key of ['appName', 'save', 'privacyTitle', 'checkNow']) {
      const value = t(key, {}, language.code);
      assert.ok(value && value !== key, `${language.code}: ${key}`);
    }
  }
});

test('setLanguage switches the current dictionary', async () => {
  await setLanguage('ru', false);
  assert.equal(t('checkNow'), 'Проверить сейчас');
  await setLanguage('ja', false);
  assert.equal(t('checkNow'), '今すぐ確認');
  await setLanguage('en', false);
  assert.equal(t('checkNow'), 'Check now');
});
