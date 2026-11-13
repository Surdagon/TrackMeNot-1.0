import { readSettings, writeSettings } from './src/storage.js';
import { formatTime } from './src/util.js';
import {
  applyTranslations,
  formatDurationLocalized,
  getCurrentLanguage,
  resolveLanguage,
  setLanguage,
  t
} from './src/i18n.js';

const $ = (selector) => document.querySelector(selector);

let status = null;
let refreshTimer = null;
let countdownTimer = null;

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

function reasonLabel(reason) {
  const keys = {
    ok: 'reasonOk',
    disabled: 'reasonDisabled',
    paused: 'reasonPaused',
    'daily-cap': 'reasonDailyCap',
    'outside-hours': 'reasonOutsideHours',
    'no-engine': 'reasonNoEngine',
    'cooling-down': 'reasonCooling',
    'no-query': 'reasonNoQuery',
    'network-error': 'reasonNetwork',
    timeout: 'reasonTimeout',
    blocked: 'reasonBlocked',
    'http-error': 'reasonHttp',
    'local-only': 'reasonLocal',
    'rate-limited': 'reasonRateLimited',
    busy: 'reasonBusy',
    'opaque-response': 'reasonOpaque'
  };
  return keys[reason] ? t(keys[reason]) : (reason || '—');
}

function render() {
  if (!status?.settings) return;
  const current = status.settings;
  const runtime = status.runtime || {};
  const now = Date.now();
  const paused = current.pausedUntil > now;
  const last = runtime.lastResult;

  $('#enabled').checked = Boolean(current.enabled);

  const top = $('#topStatus');
  top.className = 'popup__status';
  if (!current.enabled) {
    top.textContent = t('statusOff');
  } else if (paused) {
    top.textContent = t('statusPaused');
    top.classList.add('is-paused');
  } else if (last && !last.ok) {
    top.textContent = t('statusError');
    top.classList.add('is-error');
  } else {
    top.textContent = t('statusOn');
    top.classList.add('is-on');
  }

  const stats = runtime.stats || { attempts: 0, success: 0, errors: 0 };
  $('#today').textContent = `${stats.attempts} / ${current.dailyCap || '∞'}`;
  $('#todayHint').textContent = t('todayHint', { success: stats.success, errors: stats.errors });

  if (last) {
    $('#lastResult').textContent = `${last.engineName || last.engineId || 'engine'} · ${last.ok ? t('reasonOk') : reasonLabel(last.reason)}`;
    $('#lastHint').textContent = `${formatTime(last.at, getCurrentLanguage())} · ${formatDurationLocalized(last.durationMs)}${last.status ? ` · HTTP ${last.status}` : ''}`;
  } else {
    $('#lastResult').textContent = '—';
    $('#lastHint').textContent = t('noRequestsYet');
  }

  $('#pause').textContent = paused ? t('resume') : t('pauseHour');
  $('#customCount').textContent = t('popupCustomCount', { count: Number(current.customWordsCount) || 0 });

  const enabledEngines = (status.engines || []).filter((engine) => engine.enabled);
  $('#engineInfo').textContent = enabledEngines.length
    ? enabledEngines.map((engine) => engine.name).join(' · ')
    : t('popupNoEngines');

  const note = $('#popupNote');
  if (!current.enabled) {
    note.textContent = t('popupNoteDisabled');
  } else if (paused) {
    note.textContent = t('popupNotePaused');
  } else if (current.dailyCap > 0 && stats.attempts >= current.dailyCap) {
    note.textContent = t('popupNoteCap');
  } else if (current.localOnly) {
    note.textContent = t('popupNoteLocal');
  } else if (enabledEngines.length === 0) {
    note.textContent = t('popupNoteNoEngines');
  } else {
    note.textContent = t('popupNoteDefault');
  }

  updateCountdown();
}

function updateCountdown() {
  if (!status?.settings) return;
  const current = status.settings;
  const nextRunAt = status.runtime?.nextRunAt || 0;
  const now = Date.now();

  if (!current.enabled) {
    $('#nextRun').textContent = '—';
    $('#nextHint').textContent = t('statusOff');
    return;
  }
  if (current.pausedUntil > now) {
    $('#nextRun').textContent = t('statusPaused');
    $('#nextHint').textContent = t('pausedUntil', { time: formatTime(current.pausedUntil, getCurrentLanguage()) });
    return;
  }
  if (!nextRunAt) {
    $('#nextRun').textContent = '—';
    $('#nextHint').textContent = t('statusLoading');
    return;
  }

  const diff = nextRunAt - now;
  $('#nextRun').textContent = diff <= 1000 ? t('durationNow') : formatDurationLocalized(diff);
  $('#nextHint').textContent = formatTime(nextRunAt, getCurrentLanguage());
}

async function refresh() {
  try {
    const response = await sendMessage({ type: 'getStatus' });
    if (response?.settings) {
      status = response;
      render();
    }
  } catch {
    $('#topStatus').textContent = t('popupNoConnection');
    $('#topStatus').className = 'popup__status is-error';
  }
}

async function toggleEnabled() {
  try {
    const settings = await readSettings();
    settings.enabled = $('#enabled').checked;
    await writeSettings(settings);
    await refresh();
  } catch (error) {
    $('#popupNote').textContent = t('toastRunError', { error: error.message });
  }
}

async function togglePause() {
  try {
    const settings = await readSettings();
    if (settings.pausedUntil > Date.now()) {
      settings.pausedUntil = 0;
    } else {
      settings.pausedUntil = Date.now() + 60 * 60 * 1000;
    }
    await writeSettings(settings);
    await refresh();
  } catch (error) {
    $('#popupNote').textContent = t('toastRunError', { error: error.message });
  }
}

async function runNow() {
  const button = $('#runNow');
  button.disabled = true;
  button.textContent = t('statusLoading');
  try {
    const result = await sendMessage({ type: 'runNow' });
    if (result?.ok) {
      $('#popupNote').textContent = t('toastRunDone', {
        engine: result.engineName || result.engineId,
        status: result.status ? `HTTP ${result.status}` : t('reasonLocal'),
        duration: formatDurationLocalized(result.durationMs)
      });
    } else {
      $('#popupNote').textContent = t('toastRunSkipped', { reason: reasonLabel(result?.reason) });
    }
    await refresh();
  } catch (error) {
    $('#popupNote').textContent = t('toastRunError', { error: error.message });
  } finally {
    button.disabled = false;
    button.textContent = t('checkNow');
  }
}

function bindEvents() {
  $('#enabled').addEventListener('change', () => {
    void toggleEnabled();
  });
  $('#pause').addEventListener('click', () => {
    void togglePause();
  });
  $('#runNow').addEventListener('click', () => {
    void runNow();
  });
  $('#openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });
}

async function init() {
  const language = await resolveLanguage();
  await setLanguage(language, false);
  applyTranslations(document, language);
  $('#todayHint').textContent = t('todayHint', { success: 0, errors: 0 });
  $('#customCount').textContent = t('popupCustomCount', { count: 0 });

  bindEvents();
  void refresh();
  refreshTimer = setInterval(() => {
    void refresh();
  }, 5000);
  countdownTimer = setInterval(updateCountdown, 1000);
  window.addEventListener('unload', () => {
    clearInterval(refreshTimer);
    clearInterval(countdownTimer);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}
