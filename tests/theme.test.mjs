import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_THEME,
  THEME_PRESETS,
  applyTheme,
  sanitizeTheme
} from '../src/theme.js';

test('the default theme is the dark book theme', () => {
  assert.equal(DEFAULT_THEME.preset, 'book');
  assert.equal(sanitizeTheme({}).preset, 'custom');
  assert.equal(sanitizeTheme({ preset: 'book' }).font, 'serif');
});

test('theme presets expand into valid colors and fonts', () => {
  const warm = sanitizeTheme({ preset: 'warm' });
  assert.equal(warm.background, THEME_PRESETS.warm.background);
  assert.equal(warm.font, 'sans');

  const paper = sanitizeTheme({ preset: 'paper' });
  assert.equal(paper.background, THEME_PRESETS.paper.background);
});

test('custom theme values are validated and clamped', () => {
  const theme = sanitizeTheme({
    preset: 'custom',
    background: '#ffffff',
    surface: 'not-a-color',
    text: '#000000',
    accent: '#ff0000',
    font: 'mono',
    fontSize: 99
  });
  assert.equal(theme.background, '#ffffff');
  assert.equal(theme.surface, DEFAULT_THEME.surface);
  assert.equal(theme.accent, '#ff0000');
  assert.equal(theme.font, 'mono');
  assert.equal(theme.fontSize, 20);
});

test('applyTheme writes the CSS custom properties', () => {
  const values = {};
  const root = {
    style: {
      setProperty: (name, value) => {
        values[name] = value;
      }
    }
  };
  applyTheme({ preset: 'book' }, root);
  assert.equal(values['--bg'], THEME_PRESETS.book.background);
  assert.equal(values['--text'], THEME_PRESETS.book.text);
  assert.equal(values['--font-size'], '15px');
  assert.match(values['--font'], /Georgia/);
});
