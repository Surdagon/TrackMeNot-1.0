# TrackMeNot 1.0 — Privacy

TrackMeNot 1.0 is available in 10 interface languages. Language choice does not change what data is processed or where it goes.

## What the extension does

- Periodically sends synthetic search queries to the **search engines you select**.
- Stores settings, custom words, statistics and (optionally) a local log in `chrome.storage.local`.
- Reads a `.txt` word list only when you choose it, locally through a file input.

## What it does not do

- It does not read or send cookies.
- It does not inject into pages (no content scripts).
- It does not read history, tabs, bookmarks, clipboard, forms or page content.
- It does not use `chrome.storage.sync`, analytics, telemetry, external APIs or remote code.
- It does not click ads or search results.
- It does not open tabs.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Settings, words, statistics and logs stay local |
| `alarms` | One-shot timer for the next query |
| `host_permissions` for search engines | `fetch` to the selected search domains |

No `cookies`, `tabs`, `history`, `webNavigation`, `scripting` or `<all_urls>`.

## What the search engine can still see

- your IP address;
- the fact and time of the HTTP request;
- the synthetic query itself;
- headers normally sent by a browser `fetch` (including a possible `Origin: chrome-extension://…`).

Cookies, Referer and account data are not sent, but this does **not** make you anonymous. Use VPN/Tor and a separate browser profile if you need network anonymity.

## Logs

Logs are disabled by default. If enabled:

- only metadata is written by default (time, engine, status, duration);
- query text is written only with a separate opt-in;
- the log is local, size-limited, and can be cleared or exported to `.txt`.

## Delete data

The **Erase all data** button removes settings, custom words, logs and statistics from `chrome.storage.local`. Uninstalling the extension also removes its local data.

---

## Кратко по-русски

Расширение отправляет синтетические запросы только на выбранные поисковики, не читает и не отправляет cookies, не внедряется в страницы, не читает историю и вкладки, не использует sync и аналитику. Настройки, слова, статистика и логи хранятся локально в `chrome.storage.local`. Запросы всё равно уходят с вашего IP на выбранный поисковик — это не анонимность; для сети используйте VPN/Tor и отдельный профиль. Логи по умолчанию выключены; текст запросов пишется только по отдельному согласию.
