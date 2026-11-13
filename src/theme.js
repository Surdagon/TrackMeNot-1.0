export const THEME_PRESETS = {
  book: {
    preset: 'book',
    background: '#1b1b1b',
    surface: '#242424',
    text: '#d6d0c4',
    accent: '#c9a86a',
    font: 'serif',
    fontSize: 15
  },
  warm: {
    preset: 'warm',
    background: '#17110e',
    surface: '#241a14',
    text: '#f3e7d7',
    accent: '#e8a45c',
    font: 'sans',
    fontSize: 15
  },
  paper: {
    preset: 'paper',
    background: '#f0e6d2',
    surface: '#fbf5e8',
    text: '#2b2118',
    accent: '#9a5b2e',
    font: 'serif',
    fontSize: 15
  }
};

export const DEFAULT_THEME = { ...THEME_PRESETS.book };

const FONT_STACKS = {
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace'
};

const HEX = /^#[0-9a-f]{6}$/i;

function validColor(value, fallback) {
  return typeof value === 'string' && HEX.test(value) ? value : fallback;
}

function hexToRgb(hex) {
  const value = validColor(hex, '#000000').slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function toHex({ r, g, b }) {
  const part = (value) => Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(first, second, weight = 0.5) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const ratio = Math.max(0, Math.min(1, weight));
  return toHex({
    r: a.r * (1 - ratio) + b.r * ratio,
    g: a.g * (1 - ratio) + b.g * ratio,
    b: a.b * (1 - ratio) + b.b * ratio
  });
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function sanitizeTheme(input) {
  const source = input && typeof input === 'object' ? input : {};
  const preset = ['book', 'warm', 'paper'].includes(source.preset) ? source.preset : 'custom';
  const base = preset === 'custom' ? DEFAULT_THEME : THEME_PRESETS[preset];

  return {
    preset,
    background: validColor(source.background, base.background),
    surface: validColor(source.surface, base.surface),
    text: validColor(source.text, base.text),
    accent: validColor(source.accent, base.accent),
    font: ['sans', 'serif', 'mono'].includes(source.font) ? source.font : base.font,
    fontSize: Math.max(12, Math.min(20, Math.round(Number(source.fontSize) || base.fontSize)))
  };
}

export function applyTheme(input, root = document.documentElement) {
  const theme = sanitizeTheme(input);
  const dark = theme.preset !== 'paper';
  const accentInk = luminance(theme.accent) > 0.55 ? '#1b140c' : '#fff7e8';

  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--bg-2', mix(theme.background, theme.surface, 0.35));
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-2', mix(theme.surface, theme.text, 0.08));
  root.style.setProperty('--surface-3', mix(theme.surface, theme.text, 0.16));
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--muted', mix(theme.text, theme.background, 0.35));
  root.style.setProperty('--faint', mix(theme.text, theme.background, 0.55));
  root.style.setProperty('--border', mix(theme.surface, theme.text, 0.24));
  root.style.setProperty('--border-strong', mix(theme.surface, theme.text, 0.38));
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-strong', mix(theme.accent, '#000000', 0.18));
  root.style.setProperty('--accent-ink', accentInk);
  root.style.setProperty('--accent-soft', rgba(theme.accent, 0.28));
  root.style.setProperty('--accent-glow', rgba(theme.accent, 0.14));
  root.style.setProperty('--bg-glow', rgba(theme.accent, dark ? 0.14 : 0.1));
  root.style.setProperty('--bg-glow-2', rgba(theme.accent, dark ? 0.06 : 0.05));
  root.style.setProperty('--font', FONT_STACKS[theme.font]);
  root.style.setProperty('--font-size', `${theme.fontSize}px`);
  root.style.setProperty('--popup-font-size', `${Math.max(12, theme.fontSize - 1)}px`);
  root.style.setProperty('--shadow', dark
    ? '0 24px 60px rgba(0, 0, 0, 0.38)'
    : '0 24px 60px rgba(72, 48, 28, 0.14)');
  root.style.colorScheme = dark ? 'dark' : 'light';
  return theme;
}
