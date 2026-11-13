# TrackMeNot 1.0 — Privacy

TrackMeNot 1.0 is available in 10 interface languages. Language choice does not change what data is processed or where it goes.

## What the extension does

- Periodically sends synthetic search queries to the **search engines you select**.
- Optionally clicks one organic search result when **Click search results** is enabled (off by default).
- Stores settings, custom words, statistics and (optionally) a local log in `chrome.storage.local`.
- Reads a `.txt` word list only when you choose it, locally through a file input.

## What it does not do

- It does not read or send cookies.
- It does not inject content scripts into the sites you browse.
- It does not read history, tabs, bookmarks, clipboard, forms or page content.
- It does not use `chrome.storage.sync`, analytics, telemetry, external APIs or remote code.
- It does not click anything unless click mode is enabled. Click mode only selects organic results and never clicks ads.
- It does not open tabs unless click mode is enabled. Click mode opens one temporary inactive tab.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Settings, words, statistics and logs stay local |
| `alarms` | One-shot timer for the next query |
| `scripting` | One-off injection into the temporary tab only when click mode is enabled |
| `host_permissions` for search engines | `fetch` to the selected search domains |

No `cookies`, `tabs`, `history`, `webNavigation` or `<all_urls>`.

## What the search engine can still see

- your IP address;
- the fact and time of the HTTP request;
- the synthetic query itself;
- headers normally sent by a browser `fetch` (including a possible `Origin: chrome-extension://…`).

Cookies, Referer and account data are not sent for the synthetic request, but this does **not** make you anonymous. Use VPN/Tor and a separate browser profile if you need network anonymity.

## Click mode

**Click search results** is experimental and off by default. When enabled:

- the extension opens a temporary inactive tab with the search URL;
- that tab uses your normal browser profile, cookies and history;
- it injects a one-off script into that tab only;
- it clicks one random organic result and closes the tab;
- it never clicks ads.

This is less private than the default mode. Leave it off unless you specifically need click noise and understand the trade-off.

## Logs

Logs are disabled by default. If enabled:

- only metadata is written by default (time, engine, status, duration);
- query text is written only with a separate opt-in;
- the log is local, size-limited, and can be cleared or exported to `.txt`.

## Delete data

The **Erase all data** button removes settings, custom words, logs and statistics from `chrome.storage.local`. Uninstalling the extension also removes its local data.

---

## Кратко по-русски

Расширение отправляет синтетические запросы только на выбранные поисковики, не читает и не отправляет cookies, не внедряется в посещаемые страницы, не читает историю и вкладки, не использует sync и аналитику. Режим кликов по результатам выключен по умолчанию; при включении он использует временную вкладку, обычный профиль, cookies и историю и кликает только по органическим результатам. Настройки, слова, статистика и логи хранятся локально в `chrome.storage.local`. Запросы всё равно уходят с вашего IP на выбранный поисковик — это не анонимность; для сети используйте VPN/Tor и отдельный профиль. Логи по умолчанию выключены; текст запросов пишется только по отдельному согласию.
