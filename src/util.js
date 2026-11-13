import { LIMITS } from './config.js';

export const MS = {
  second: 1000,
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000
};

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(defaults, stored) {
  if (Array.isArray(defaults)) {
    return Array.isArray(stored) ? stored.slice() : defaults.slice();
  }
  if (!isPlainObject(defaults)) {
    return stored === undefined ? defaults : stored;
  }
  const result = { ...defaults };
  if (!isPlainObject(stored)) return result;
  for (const [key, value] of Object.entries(stored)) {
    result[key] = key in defaults ? deepMerge(defaults[key], value) : value;
  }
  return result;
}

export function pick(array, random = Math.random) {
  if (!Array.isArray(array) || array.length === 0) return undefined;
  return array[Math.floor(random() * array.length)];
}

export function randomInt(min, max, random = Math.random) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return low + Math.floor(random() * (high - low + 1));
}

export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < MS.minute) {
    return `${Math.max(1, Math.round(ms / MS.second))} сек`;
  }
  if (ms < MS.hour) {
    return `${Math.round(ms / MS.minute)} мин`;
  }
  const hours = Math.floor(ms / MS.hour);
  const minutes = Math.round((ms % MS.hour) / MS.minute);
  return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
}

export function formatDateTime(value, locale = undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale || undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(value, locale = undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(locale || undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function normalizeQuery(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.maxCustomWordLength);
}

/**
 * Разбирает .txt-файл со словами/фразами.
 * Формат: одна фраза на строку, строки с # игнорируются.
 */
export function parseCustomWords(text, options = {}) {
  const maxWords = options.maxWords ?? LIMITS.maxCustomWords;
  const maxLength = options.maxLength ?? LIMITS.maxCustomWordLength;
  const words = [];
  const seen = new Set();
  let skipped = 0;
  let truncated = false;

  const source = String(text ?? '').replace(/^\uFEFF/, '');
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const compact = line.replace(/\s+/g, ' ').trim();
    if (compact.length > maxLength) {
      skipped += 1;
      continue;
    }

    const normalized = normalizeQuery(compact);
    if (!normalized) {
      skipped += 1;
      continue;
    }
    const key = normalized.toLocaleLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    if (words.length >= maxWords) {
      skipped += 1;
      truncated = true;
      continue;
    }
    seen.add(key);
    words.push(normalized);
  }

  return { words, skipped, truncated };
}

export function serializeCustomWords(words, options = {}) {
  const maxWords = options.maxWords ?? LIMITS.maxCustomWords;
  const maxLength = options.maxLength ?? LIMITS.maxCustomWordLength;
  const list = Array.isArray(words) ? words : [];
  const normalized = list
    .map((word) => normalizeQuery(word))
    .filter((word) => word && word.length <= maxLength)
    .slice(0, maxWords);

  return [
    '# TrackMeNot Privacy — список своих слов и фраз',
    '# Одна фраза на строку. Строки с # игнорируются.',
    '# Файл хранится только локально и не синхронизируется.',
    '',
    ...normalized,
    ''
  ].join('\n');
}

export function isWithinActiveHours(activeHours, date = new Date()) {
  if (!activeHours || !activeHours.enabled) return true;
  const start = clamp(Number(activeHours.start) || 0, 0, 23);
  const end = clamp(Number(activeHours.end) || 0, 0, 23);
  if (start === end) return true;
  const hour = date.getHours();
  return start < end
    ? hour >= start && hour < end
    : hour >= start || hour < end;
}

export function nextActiveStart(activeHours, date = new Date()) {
  if (!activeHours || !activeHours.enabled || isWithinActiveHours(activeHours, date)) {
    return date.getTime();
  }
  const start = clamp(Number(activeHours.start) || 0, 0, 23);
  const candidate = new Date(date);
  candidate.setHours(start, 0, 0, 0);
  if (candidate.getTime() <= date.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return candidate.getTime();
}

export function nextMidnight(date = new Date()) {
  const candidate = new Date(date);
  candidate.setDate(candidate.getDate() + 1);
  candidate.setHours(0, 0, 0, 0);
  return candidate.getTime();
}

export function addPositiveJitter(timestamp, maxMs = 5 * MS.minute, random = Math.random) {
  if (!timestamp) return 0;
  return timestamp + Math.floor(random() * maxMs);
}

export function nextDailyReset(date = new Date()) {
  return addPositiveJitter(nextMidnight(date), 5 * MS.minute);
}

export function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}
