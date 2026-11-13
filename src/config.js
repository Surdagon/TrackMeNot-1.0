export const APP_NAME = 'TrackMeNot Privacy';
export const APP_VERSION = '1.2.2';

export const ENGINES = [
  {
    id: 'google',
    name: 'Google',
    host: 'www.google.com',
    searchUrl: 'https://www.google.com/search',
    queryParam: 'q',
    defaultEnabled: true,
    note: 'Самый распространённый профилировщик. Часто показывает consent-страницу или CAPTCHA.'
  },
  {
    id: 'bing',
    name: 'Bing',
    host: 'www.bing.com',
    searchUrl: 'https://www.bing.com/search',
    queryParam: 'q',
    defaultEnabled: true,
    note: 'Поиск Microsoft. Может требовать cookie/consent для обычной выдачи.'
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    host: 'duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/',
    queryParam: 'q',
    defaultEnabled: false,
    note: 'Privacy-friendly поисковик. Шум здесь нужен реже, но вариант допустим.'
  },
  {
    id: 'brave',
    name: 'Brave Search',
    host: 'search.brave.com',
    searchUrl: 'https://search.brave.com/search',
    queryParam: 'q',
    defaultEnabled: false,
    note: 'Собственный индекс Brave. Обычно хорошо отвечает на прямые GET-запросы.'
  },
  {
    id: 'startpage',
    name: 'Startpage',
    host: 'www.startpage.com',
    searchUrl: 'https://www.startpage.com/sp/search',
    queryParam: 'query',
    defaultEnabled: false,
    note: 'Прокси-поиск Google без персонализации. Может показывать проверку.'
  },
  {
    id: 'yandex',
    name: 'Яндекс',
    host: 'yandex.ru',
    searchUrl: 'https://yandex.ru/search/',
    queryParam: 'text',
    defaultEnabled: false,
    note: 'Российский поисковик. Полезен, если вы им реально пользуетесь.'
  }
];

export const ENGINE_BY_ID = Object.fromEntries(ENGINES.map((engine) => [engine.id, engine]));

export const DEFAULT_ENGINE_FLAGS = Object.fromEntries(
  ENGINES.map((engine) => [engine.id, engine.defaultEnabled])
);

export const SETTINGS_KEY = 'settings';
export const RUNTIME_KEY = 'runtime';
export const LOG_KEY = 'log';
export const UI_LANGUAGE_KEY = 'uiLanguage';
export const ALARM_NAME = 'tmn-next-search';
export const SETTINGS_VERSION = 1;

export const LIMITS = {
  minIntervalMinutes: 1,
  maxIntervalMinutes: 1440,
  maxDailyCap: 5000,
  maxCustomWords: 5000,
  maxCustomWordLength: 200,
  minLogEntries: 10,
  maxLogEntries: 1000,
  requestTimeoutMs: 20000
};

export const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  enabled: true,
  engines: DEFAULT_ENGINE_FLAGS,
  intervalMinutes: 10,
  dailyCap: 100,
  activeHours: {
    enabled: false,
    start: 9,
    end: 23
  },
  customWordsEnabled: true,
  customWeight: 50,
  customWords: [],
  language: 'auto',
  localOnly: false,
  simulateClicks: false,
  loggingEnabled: false,
  logQueries: false,
  maxLogEntries: 200,
  showBadge: true,
  pausedUntil: 0
};

export const DEFAULT_RUNTIME = {
  nextRunAt: 0,
  stats: {
    date: '',
    attempts: 0,
    success: 0,
    errors: 0
  },
  lastResult: null,
  engineHealth: {},
  recentQueries: [],
  lastManualRun: 0,
  lastScheduleReason: ''
};

export const QUERY_LANGUAGE_CODES = [
  'en',
  'ru',
  'es',
  'pt-BR',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'zh-CN'
];

export const INTERVAL_PRESETS = [5, 10, 15, 30, 60, 180];
