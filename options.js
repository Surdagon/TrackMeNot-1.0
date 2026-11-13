import {
  APP_VERSION,
  ENGINES,
  INTERVAL_PRESETS,
  LIMITS,
  UI_LANGUAGE_KEY
} from './src/config.js';
import {
  LANGUAGES,
  applyTranslations,
  formatDurationLocalized,
  getCurrentLanguage,
  resolveLanguage,
  setLanguage,
  t
} from './src/i18n.js';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  applyTheme,
  sanitizeTheme
} from './src/theme.js';
import {
  clearLog as clearStoredLog,
  readLog,
  readRuntime,
  readSettings,
  writeSettings
} from './src/storage.js';
import {
  formatDateTime,
  formatTime,
  parseCustomWords,
  serializeCustomWords,
  todayKey
} from './src/util.js';

const $ = (selector) => document.querySelector(selector);

let settings = null;
let status = null;
let dirty = false;
let toastTimer = null;

function setDirty(value = true) {
  dirty = value;
  const saveState = $('#saveState');
  if (!saveState) return;
  saveState.textContent = value ? t('unsaved') : t('saved');
  saveState.classList.toggle('is-saved', !value);
}

function showToast(message, kind = '') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast is-visible${kind ? ` is-${kind}` : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 4200);
}

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

function formatReason(reason) {
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
  return keys[reason] ? t(keys[reason]) : (reason || t('reasonOpaque'));
}

function formatHttp(status) {
  return status ? `HTTP ${status}` : '—';
}

function renderEngineList() {
  const container = $('#engineList');
  container.replaceChildren();

  for (const engine of ENGINES) {
    const row = document.createElement('label');
    row.className = 'engine-row';
    row.htmlFor = `engine-${engine.id}`;

    const main = document.createElement('span');
    main.className = 'engine-row__main';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `engine-${engine.id}`;
    checkbox.checked = Boolean(settings?.engines?.[engine.id]);

    const text = document.createElement('span');
    text.className = 'engine-row__text';

    const name = document.createElement('span');
    name.className = 'engine-row__name';
    name.textContent = engine.name;

    const host = document.createElement('span');
    host.className = 'engine-row__host';
    host.textContent = engine.host;

    text.append(name, host);
    main.append(checkbox, text);

    const health = document.createElement('span');
    health.className = 'health-badge';
    health.id = `health-${engine.id}`;
    health.textContent = t('healthNoData');

    row.append(main, health);
    container.append(row);
  }
}

function fillForm(nextSettings) {
  settings = nextSettings;
  $('#version').textContent = APP_VERSION;
  populateThemeControls(settings.theme?.preset);
  setThemeForm(settings.theme || DEFAULT_THEME);
  $('#enabled').checked = settings.enabled;
  $('#intervalMinutes').value = settings.intervalMinutes;
  $('#dailyCap').value = settings.dailyCap;
  $('#activeHoursEnabled').checked = settings.activeHours.enabled;
  $('#activeStart').value = settings.activeHours.start;
  $('#activeEnd').value = settings.activeHours.end;
  $('#hoursRow').hidden = !settings.activeHours.enabled;
  $('#customWordsEnabled').checked = settings.customWordsEnabled;
  $('#customWeight').value = settings.customWeight;
  $('#customWeightValue').textContent = `${settings.customWeight}%`;
  populateQueryLanguages(settings.language);
  $('#localOnly').checked = settings.localOnly;
  $('#simulateClicks').checked = settings.simulateClicks;
  $('#loggingEnabled').checked = settings.loggingEnabled;
  $('#logQueries').checked = settings.logQueries;
  $('#maxLogEntries').value = settings.maxLogEntries;
  $('#showBadge').checked = settings.showBadge;
  $('#customWords').value = settings.customWords.join('\n');
  $('#customWordsCount').textContent = t('phrasesCount', { count: settings.customWords.length });
  $('#customCountValue').textContent = String(settings.customWords.length);

  for (const engine of ENGINES) {
    const checkbox = $(`#engine-${engine.id}`);
    if (checkbox) checkbox.checked = Boolean(settings.engines[engine.id]);
  }

  updateWordsCount();
  updatePauseButton();
  setDirty(false);
}

function collectFormSettings() {
  const parsed = parseCustomWords($('#customWords').value, {
    maxWords: LIMITS.maxCustomWords,
    maxLength: LIMITS.maxCustomWordLength
  });

  const engines = {};
  for (const engine of ENGINES) {
    engines[engine.id] = Boolean($(`#engine-${engine.id}`)?.checked);
  }

  return {
    parsed,
    nextSettings: {
      ...settings,
      enabled: $('#enabled').checked,
      engines,
      intervalMinutes: Number($('#intervalMinutes').value),
      dailyCap: Number($('#dailyCap').value),
      activeHours: {
        enabled: $('#activeHoursEnabled').checked,
        start: Number($('#activeStart').value),
        end: Number($('#activeEnd').value)
      },
      customWordsEnabled: $('#customWordsEnabled').checked,
      customWeight: Number($('#customWeight').value),
      customWords: parsed.words,
      language: $('#language').value,
      localOnly: $('#localOnly').checked,
      simulateClicks: $('#simulateClicks').checked,
      theme: currentThemeFromForm(),
      loggingEnabled: $('#loggingEnabled').checked,
      logQueries: $('#logQueries').checked,
      maxLogEntries: Number($('#maxLogEntries').value),
      showBadge: $('#showBadge').checked
    }
  };
}

async function save() {
  if (!settings) return;

  try {
    // Re-read first so a pause set from the popup is not overwritten by stale form state.
    settings = await readSettings();
    const { parsed, nextSettings } = collectFormSettings();
    settings = await writeSettings(nextSettings);
    setThemeForm(settings.theme);
    $('#customWords').value = settings.customWords.join('\n');
    updateWordsCount();
    setDirty(false);
    await refreshStatus();

    if (parsed.skipped > 0) {
      showToast(t('toastSkipped', { count: parsed.skipped }), 'success');
    } else {
      showToast(t('toastSaved'), 'success');
    }

    try {
      await sendMessage({ type: 'reschedule' });
    } catch {
      // The storage listener in the service worker will reschedule anyway.
    }

    if (Object.values(settings.engines).every((value) => !value)) {
      showToast(t('toastNoEngine'), 'error');
    }
  } catch (error) {
    showToast(t('toastSaveError', { error: error.message }), 'error');
  }
}

function updateWordsCount() {
  const textarea = $('#customWords');
  const parsed = parseCustomWords(textarea.value, {
    maxWords: LIMITS.maxCustomWords,
    maxLength: LIMITS.maxCustomWordLength
  });
  $('#customWordsCount').textContent = t('phrasesCount', { count: parsed.words.length });
  $('#customWordsWarning').textContent = parsed.skipped
    ? t('skippedCount', { count: parsed.skipped })
    : '';
  $('#customCountValue').textContent = String(parsed.words.length);
}

function updatePauseButton() {
  if (!settings) return;
  const paused = settings.pausedUntil > Date.now();
  $('#pause').textContent = paused ? t('resume') : t('pauseHour');
  $('#resume').disabled = !paused;
}

function renderStatus(nextStatus) {
  status = nextStatus;
  if (!status?.settings) return;

  const { settings: current, runtime } = status;
  const now = Date.now();
  const paused = current.pausedUntil > now;
  const last = runtime?.lastResult;
  const error = last && !last.ok;

  const top = $('#topStatus');
  top.className = 'status-pill';
  if (!current.enabled) {
    top.textContent = t('statusOff');
    top.classList.add('is-off');
  } else if (paused) {
    top.textContent = t('statusPaused');
    top.classList.add('is-paused');
  } else if (error) {
    top.textContent = t('statusError');
    top.classList.add('is-error');
  } else {
    top.textContent = t('statusOn');
    top.classList.add('is-on');
  }

  const stats = runtime?.stats || { attempts: 0, success: 0, errors: 0 };
  $('#todayValue').textContent = `${stats.attempts} / ${current.dailyCap || '∞'}`;
  $('#todayHint').textContent = t('todayHint', { success: stats.success, errors: stats.errors });

  if (last) {
    $('#lastResultValue').textContent = last.ok
      ? `${last.engineName || last.engineId} · ${t('reasonOk')}`
      : `${last.engineName || last.engineId} · ${t('statusError')}`;
    $('#lastResultHint').textContent = `${formatTime(last.at, getCurrentLanguage())} · ${formatDurationLocalized(last.durationMs)} · ${formatHttp(last.status)} · ${formatReason(last.reason)}`;
  } else {
    $('#lastResultValue').textContent = '—';
    $('#lastResultHint').textContent = t('noRequestsYet');
  }

  const customWordsCount = Number(current.customWordsCount) || 0;
  $('#customCountValue').textContent = String(customWordsCount);
  if (!dirty) {
    $('#customWordsCount').textContent = t('phrasesCount', { count: customWordsCount });
  }

  const note = $('#statusNote');
  if (!current.enabled) {
    note.textContent = t('statusNoteDisabled');
  } else if (paused) {
    note.textContent = t('statusNotePaused', { time: formatDateTime(current.pausedUntil, getCurrentLanguage()) });
  } else if (current.dailyCap > 0 && stats.attempts >= current.dailyCap) {
    note.textContent = t('statusNoteCap');
  } else if (current.activeHours?.enabled) {
    note.textContent = t('statusNoteHours', { start: current.activeHours.start, end: current.activeHours.end });
  } else if (current.localOnly) {
    note.textContent = t('statusNoteLocal');
  } else {
    note.textContent = t('statusNoteDefault');
  }

  renderEngineHealth(status.engines || []);
  updateCountdown();
}

function renderEngineHealth(engines) {
  const now = Date.now();
  for (const engine of engines) {
    const badge = $(`#health-${engine.id}`);
    if (!badge) continue;
    const health = engine.health;
    badge.className = 'health-badge';

    if (!engine.enabled) {
      badge.textContent = t('healthOff');
      continue;
    }
    if (health?.blockedUntil > now) {
      badge.textContent = t('healthBlocked', { time: formatTime(health.blockedUntil, getCurrentLanguage()) });
      badge.classList.add('is-blocked');
      continue;
    }
    if (health?.lastAt) {
      const ok = health.lastStatus >= 200 && health.lastStatus < 400;
      badge.textContent = ok ? t('healthOk') : formatReason(health.lastReason);
      badge.classList.add(ok ? 'is-ok' : 'is-error');
      continue;
    }
    badge.textContent = t('healthNoData');
  }
}

function updateCountdown() {
  if (!status?.settings) return;
  const current = status.settings;
  const runtime = status.runtime;
  const now = Date.now();

  if (!current.enabled) {
    $('#nextRunValue').textContent = '—';
    $('#nextRunHint').textContent = t('statusOff');
    return;
  }
  if (current.pausedUntil > now) {
    $('#nextRunValue').textContent = t('statusPaused');
    $('#nextRunHint').textContent = formatDateTime(current.pausedUntil, getCurrentLanguage());
    return;
  }
  if (!runtime?.nextRunAt || runtime.nextRunAt <= 0) {
    $('#nextRunValue').textContent = '—';
    $('#nextRunHint').textContent = t('statusLoading');
    return;
  }
  const diff = runtime.nextRunAt - now;
  $('#nextRunValue').textContent = diff <= 1000 ? t('durationNow') : formatDurationLocalized(diff);
  $('#nextRunHint').textContent = formatTime(runtime.nextRunAt, getCurrentLanguage());
}

async function refreshStatus() {
  try {
    const response = await sendMessage({ type: 'getStatus' });
    if (response?.settings) renderStatus(response);
  } catch {
    try {
      const [storedSettings, runtime] = await Promise.all([readSettings(), readRuntime()]);
      settings = storedSettings;
      status = {
        settings: {
          enabled: storedSettings.enabled,
          pausedUntil: storedSettings.pausedUntil,
          intervalMinutes: storedSettings.intervalMinutes,
          dailyCap: storedSettings.dailyCap,
          activeHours: storedSettings.activeHours,
          customWordsEnabled: storedSettings.customWordsEnabled,
          customWeight: storedSettings.customWeight,
          customWordsCount: storedSettings.customWords.length,
          language: storedSettings.language,
          localOnly: storedSettings.localOnly,
          loggingEnabled: storedSettings.loggingEnabled,
          logQueries: storedSettings.logQueries,
          maxLogEntries: storedSettings.maxLogEntries,
          showBadge: storedSettings.showBadge
        },
        runtime,
        engines: ENGINES.map((engine) => ({
          id: engine.id,
          name: engine.name,
          host: engine.host,
          enabled: Boolean(storedSettings.engines[engine.id]),
          health: runtime.engineHealth[engine.id] || null
        }))
      };
      renderStatus(status);
    } catch {
      // The service worker may be asleep; the next refresh will try again.
    }
  }
}

async function runNow() {
  const button = $('#runNow');
  button.disabled = true;
  button.textContent = t('statusLoading');
  try {
    const result = await sendMessage({ type: 'runNow' });
    if (result?.ok) {
      showToast(
        t('toastRunDone', {
          engine: result.engineName || result.engineId,
          status: result.status ? `HTTP ${result.status}` : formatReason('local-only'),
          duration: formatDurationLocalized(result.durationMs)
        }),
        'success'
      );
    } else {
      showToast(t('toastRunSkipped', { reason: formatReason(result?.reason) }), 'error');
    }
  } catch (error) {
    showToast(t('toastRunError', { error: error.message }), 'error');
  } finally {
    button.disabled = false;
    button.textContent = t('checkNow');
    await refreshStatus();
  }
}

async function pause(hour = true) {
  if (!settings) return;
  try {
    const latest = await readSettings();
    const base = latest.pausedUntil > Date.now() ? latest.pausedUntil : Date.now();
    latest.pausedUntil = base + hour * 60 * 60 * 1000;
    settings = await writeSettings(latest);
    updatePauseButton();
    await refreshStatus();
    showToast(hour ? t('toastPause') : t('toastResume'), 'success');
  } catch (error) {
    showToast(t('toastPauseError', { error: error.message }), 'error');
  }
}

async function resume() {
  if (!settings) return;
  try {
    const latest = await readSettings();
    latest.pausedUntil = 0;
    settings = await writeSettings(latest);
    updatePauseButton();
    await refreshStatus();
    showToast(t('toastResume'), 'success');
  } catch (error) {
    showToast(t('toastResumeError', { error: error.message }), 'error');
  }
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

function downloadWords() {
  const parsed = parseCustomWords($('#customWords').value, {
    maxWords: LIMITS.maxCustomWords,
    maxLength: LIMITS.maxCustomWordLength
  });
  if (!parsed.words.length) {
    showToast(t('toastWordsEmpty'), 'error');
    return;
  }
  download('custom-words.txt', serializeCustomWords(parsed.words));
  showToast(t('toastWordsDownloaded', { count: parsed.words.length }), 'success');
}

async function handleFile(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    showToast(t('toastFileTooBig'), 'error');
    return;
  }
  if (!/\.txt$/i.test(file.name) && file.type !== 'text/plain') {
    showToast(t('toastFileType'), 'error');
    return;
  }

  let text;
  try {
    text = await file.text();
  } catch (error) {
    showToast(t('toastFileReadError', { error: error.message }), 'error');
    return;
  }

  const parsed = parseCustomWords(text, {
    maxWords: LIMITS.maxCustomWords,
    maxLength: LIMITS.maxCustomWordLength
  });
  if (!parsed.words.length) {
    showToast(t('toastFileEmpty'), 'error');
    return;
  }

  const textarea = $('#customWords');
  const mode = $('#importMode').value;
  if (mode === 'append' && textarea.value.trim()) {
    const existing = parseCustomWords(textarea.value, {
      maxWords: LIMITS.maxCustomWords,
      maxLength: LIMITS.maxCustomWordLength
    });
    textarea.value = [...existing.words, ...parsed.words].join('\n');
  } else {
    textarea.value = parsed.words.join('\n');
  }

  updateWordsCount();
  setDirty(true);
  showToast(
    t('toastFileLoaded', {
      count: parsed.words.length,
      skipped: parsed.skipped ? `, ${t('skippedCount', { count: parsed.skipped })}` : ''
    }),
    'success'
  );
}

function formatLogEntry(entry) {
  const parts = [
    `[${formatDateTime(entry.at, getCurrentLanguage())}]`,
    entry.engineName || entry.engineId || 'engine',
    entry.ok ? t('reasonOk') : `${t('statusError')}(${formatReason(entry.reason)})`,
    formatHttp(entry.status),
    formatDurationLocalized(entry.durationMs),
    entry.mode === 'local' ? t('modeLocal') : t('modeNetwork')
  ];
  if (entry.query) parts.push(`${t('logQuery')}="${entry.query}"`);
  return parts.join(' | ');
}

async function downloadLog() {
  const log = await readLog();
  if (!log.length) {
    showToast(t('toastLogEmpty'), 'error');
    return;
  }
  const header = [
    `# ${t('logExportHeader')}`,
    `# ${t('logExportDate', { date: formatDateTime(Date.now(), getCurrentLanguage()) })}`,
    `# ${t('logExportHint')}`,
    ''
  ];
  download(`trackmenot-log-${todayKey()}.txt`, [...header, ...log.map(formatLogEntry), ''].join('\n'));
  showToast(t('toastLogDownloaded', { count: log.length }), 'success');
}

async function showLog() {
  const log = await readLog();
  const container = $('#logTable');
  container.replaceChildren();

  if (!log.length) {
    const empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.textContent = t('logEmpty');
    container.append(empty);
    if (!$('#logDialog').open) $('#logDialog').showModal();
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const key of ['logTime', 'logEngine', 'logResult', 'logDuration', 'logQuery']) {
    const th = document.createElement('th');
    th.textContent = t(key);
    headRow.append(th);
  }
  thead.append(headRow);

  const tbody = document.createElement('tbody');
  for (const entry of log) {
    const row = document.createElement('tr');

    const time = document.createElement('td');
    time.textContent = formatDateTime(entry.at, getCurrentLanguage());

    const engine = document.createElement('td');
    engine.textContent = entry.engineName || entry.engineId || '—';

    const result = document.createElement('td');
    result.textContent = entry.ok ? t('reasonOk') : formatReason(entry.reason);
    result.className = entry.ok ? 'is-ok' : 'is-error';

    const duration = document.createElement('td');
    duration.textContent = formatDurationLocalized(entry.durationMs);

    const query = document.createElement('td');
    query.className = 'log-query';
    query.textContent = entry.query || '—';

    row.append(time, engine, result, duration, query);
    tbody.append(row);
  }

  table.append(thead, tbody);
  container.append(table);
  $('#logDialog').showModal();
}

async function clearLog() {
  if (!confirm(t('confirmClearLog'))) return;
  await clearStoredLog();
  showToast(t('toastLogCleared'), 'success');
  await refreshStatus();
}

async function resetAll() {
  if (!confirm(t('toastResetConfirm'))) return;
  if (!confirm(t('toastResetConfirm2'))) return;

  try {
    const response = await sendMessage({ type: 'resetAll' });
    if (response?.ok) {
      showToast(t('toastResetDone'), 'success');
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(t('toastResetError'), 'error');
    }
  } catch (error) {
    showToast(t('toastRunError', { error: error.message }), 'error');
  }
}

function bindEvents() {
  $('#save').addEventListener('click', () => {
    void save();
  });

  $('#runNow').addEventListener('click', () => {
    void runNow();
  });

  $('#pause').addEventListener('click', () => {
    void pause();
  });

  $('#resume').addEventListener('click', () => {
    void resume();
  });

  $('#themePreset').addEventListener('change', (event) => {
    const preset = event.target.value;
    if (preset !== 'custom' && THEME_PRESETS[preset]) {
      setThemeForm(THEME_PRESETS[preset]);
    } else {
      applyThemeFromForm();
    }
    setDirty(true);
  });

  for (const selector of ['#themeBackground', '#themeSurface', '#themeText', '#themeAccent']) {
    $(selector).addEventListener('input', () => {
      $('#themePreset').value = 'custom';
      applyThemeFromForm();
      setDirty(true);
    });
  }

  $('#themeFont').addEventListener('change', () => {
    $('#themePreset').value = 'custom';
    applyThemeFromForm();
    setDirty(true);
  });

  $('#themeFontSize').addEventListener('input', () => {
    $('#themePreset').value = 'custom';
    applyThemeFromForm();
    setDirty(true);
  });

  $('#themeReset').addEventListener('click', () => {
    setThemeForm(DEFAULT_THEME);
    setDirty(true);
  });

  $('#activeHoursEnabled').addEventListener('change', (event) => {
    $('#hoursRow').hidden = !event.target.checked;
    setDirty(true);
  });

  $('#customWeight').addEventListener('input', (event) => {
    $('#customWeightValue').textContent = `${event.target.value}%`;
    setDirty(true);
  });

  $('#customWords').addEventListener('input', () => {
    updateWordsCount();
    setDirty(true);
  });

  $('#intervalPresets').addEventListener('click', (event) => {
    const button = event.target.closest('[data-minutes]');
    if (!button) return;
    $('#intervalMinutes').value = button.dataset.minutes;
    setDirty(true);
  });

  $('#importBtn').addEventListener('click', () => {
    $('#fileInput').click();
  });

  $('#fileInput').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    void handleFile(file);
  });

  const dropZone = $('#dropZone');
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('is-dragover');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragover');
    void handleFile(event.dataTransfer?.files?.[0]);
  });

  $('#downloadWords').addEventListener('click', downloadWords);

  $('#clearWords').addEventListener('click', async () => {
    if (!confirm(t('confirmClearWords'))) return;
    try {
      $('#customWords').value = '';
      const latest = await readSettings();
      latest.customWords = [];
      settings = await writeSettings(latest);
      updateWordsCount();
      setDirty(false);
      await refreshStatus();
      showToast(t('toastWordsCleared'), 'success');
    } catch (error) {
      showToast(t('toastWordsClearError', { error: error.message }), 'error');
    }
  });

  $('#loggingEnabled').addEventListener('change', () => setDirty(true));
  $('#logQueries').addEventListener('change', () => setDirty(true));

  $('#showLog').addEventListener('click', () => {
    void showLog();
  });

  $('#downloadLog').addEventListener('click', () => {
    void downloadLog();
  });

  $('#dialogDownloadLog').addEventListener('click', () => {
    void downloadLog();
  });

  $('#clearLog').addEventListener('click', () => {
    void clearLog();
  });

  $('#dialogCloseLog').addEventListener('click', () => {
    $('#logDialog').close();
  });

  $('#resetAll').addEventListener('click', () => {
    void resetAll();
  });

  document.querySelector('main').addEventListener('input', () => setDirty(true));
  document.querySelector('main').addEventListener('change', () => setDirty(true));
}

function renderPresets() {
  const container = $('#intervalPresets');
  container.replaceChildren();
  for (const minutes of INTERVAL_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.dataset.minutes = String(minutes);
    button.textContent = minutes < 60
      ? `${minutes} ${t('minutesShort')}`
      : t('durationHourShort', { h: minutes / 60 });
    container.append(button);
  }
}

function populateThemeControls(selectedPreset) {
  const presetSelect = $('#themePreset');
  const currentPreset = selectedPreset || presetSelect.value || 'book';
  presetSelect.replaceChildren();
  for (const [value, key] of [
    ['book', 'themeBook'],
    ['warm', 'themeWarm'],
    ['paper', 'themePaper'],
    ['custom', 'themeCustom']
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = t(key);
    presetSelect.append(option);
  }
  presetSelect.value = currentPreset;

  const fontSelect = $('#themeFont');
  const currentFont = fontSelect.value || 'serif';
  fontSelect.replaceChildren();
  for (const [value, key] of [
    ['sans', 'fontSans'],
    ['serif', 'fontSerif'],
    ['mono', 'fontMono']
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = t(key);
    fontSelect.append(option);
  }
  fontSelect.value = currentFont;
}

function currentThemeFromForm() {
  return sanitizeTheme({
    preset: $('#themePreset').value,
    background: $('#themeBackground').value,
    surface: $('#themeSurface').value,
    text: $('#themeText').value,
    accent: $('#themeAccent').value,
    font: $('#themeFont').value,
    fontSize: Number($('#themeFontSize').value)
  });
}

function setThemeForm(theme) {
  const clean = sanitizeTheme(theme);
  $('#themePreset').value = clean.preset;
  $('#themeBackground').value = clean.background;
  $('#themeSurface').value = clean.surface;
  $('#themeText').value = clean.text;
  $('#themeAccent').value = clean.accent;
  $('#themeFont').value = clean.font;
  $('#themeFontSize').value = clean.fontSize;
  applyTheme(clean);
}

function applyThemeFromForm() {
  applyTheme(currentThemeFromForm());
}

function populateQueryLanguages(selected) {
  const select = $('#language');
  const current = selected || select.value || settings?.language || 'auto';
  select.replaceChildren();

  const auto = document.createElement('option');
  auto.value = 'auto';
  auto.textContent = t('autoLanguage');
  select.append(auto);

  for (const language of LANGUAGES) {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.label;
    select.append(option);
  }

  const mix = document.createElement('option');
  mix.value = 'mix';
  mix.textContent = t('langMix');
  select.append(mix);

  const allowed = new Set(['auto', 'mix', ...LANGUAGES.map((language) => language.code)]);
  select.value = allowed.has(current) ? current : 'auto';
}

async function populateLanguageSelect() {
  const select = $('#uiLanguage');
  select.replaceChildren();

  const auto = document.createElement('option');
  auto.value = 'auto';
  auto.textContent = t('autoLanguage');
  select.append(auto);

  for (const language of LANGUAGES) {
    const option = document.createElement('option');
    option.value = language.code;
    option.textContent = language.label;
    select.append(option);
  }

  try {
    const data = await chrome.storage.local.get(UI_LANGUAGE_KEY);
    select.value = data[UI_LANGUAGE_KEY] || 'auto';
  } catch {
    select.value = 'auto';
  }

  select.onchange = async () => {
    await setLanguage(select.value);
    applyTranslations(document);
    await populateLanguageSelect();
    populateQueryLanguages($('#language').value || settings?.language || 'auto');
    const theme = currentThemeFromForm();
    populateThemeControls($('#themePreset').value);
    setThemeForm(theme);
    renderPresets();
    updateWordsCount();
    updatePauseButton();
    setDirty(dirty);
    await refreshStatus();
  };
}

async function init() {
  applyTheme(DEFAULT_THEME);
  const language = await resolveLanguage();
  await setLanguage(language, false);
  applyTranslations(document, language);
  $('#todayHint').textContent = t('todayHint', { success: 0, errors: 0 });
  $('#customWordsCount').textContent = t('phrasesCount', { count: 0 });
  await populateLanguageSelect();
  populateQueryLanguages('auto');
  populateThemeControls('book');
  renderPresets();
  renderEngineList();

  try {
    settings = await readSettings();
    fillForm(settings);
  } catch (error) {
    showToast(t('toastLoadError', { error: error.message }), 'error');
    settings = null;
  }

  bindEvents();
  await refreshStatus();

  setInterval(() => {
    void refreshStatus();
  }, 5000);
  setInterval(updateCountdown, 1000);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.settings?.newValue) return;
    if (dirty) return;
    settings = changes.settings.newValue;
    fillForm(settings);
    void refreshStatus();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  });
} else {
  void init();
}
