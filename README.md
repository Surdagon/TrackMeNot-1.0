# TrackMeNot 1.0

**A from-scratch, independent Chrome MV3 rewrite of the TrackMeNot idea.**

This is **not** a patch of the old Chrome port and **not** a fork of the Firefox codebase. The extension was rewritten from scratch: new manifest, new service worker, new scheduler, new UI, new storage model, new tests. It is an independent project that keeps only the original idea: hide real search interest inside a stream of synthetic queries.

**Languages:** [English](#english) · [Русский](#русский) · [Español](#español) · [Português (Brasil)](#português-brasil) · [Français](#français) · [Deutsch](#deutsch) · [Italiano](#italiano) · [日本語](#日本語) · [한국어](#한국어) · [简体中文](#简体中文)

---

## English

TrackMeNot 1.0 periodically sends neutral decoy search queries to selected search engines so that the profile built from your searches becomes less accurate. It is a privacy tool, **not an anonymity tool**: requests still leave your IP and reach the chosen search engine.

### Why it is better than the original Chrome version

The original Chrome port (`TrackMeNot-Chrome-master`, version 0.10.3) is a Manifest V2 extension. Current Chrome no longer runs MV2 extensions, so that version cannot be installed normally. TrackMeNot 1.0 is a clean MV3 rewrite with a different privacy model.

| Area | Original Chrome port 0.10.3 | TrackMeNot 1.0 |
|---|---|---|
| Platform | Manifest V2; does not load in current Chrome | Manifest V3, service worker, `chrome.alarms` |
| Cookies | Hidden tab / normal profile; cookies and history can be involved | No cookies: `credentials: 'omit'`, no `cookies` permission |
| Page access | Content script on every HTTP(S) page and frame | No content scripts at all |
| Permissions | `tabs`, `webNavigation`, all URLs | Only `storage`, `alarms`, and host permissions for search engines |
| Hidden tabs | Tab mode opens an inactive tab | No tabs, no hidden windows |
| Click simulation | Clicks search results/ads | No clicks at all; no click fraud |
| Frequency | 10 queries per minute by default | 10 minutes by default; daily cap, active hours, backoff |
| Query sources | Stale 2010 zeitgeist, RSS, DHS watchlist | Local neutral corpus + your own `.txt` list |
| Logs | On by default, raw queries | Off by default; metadata only; query text is opt-in |
| Languages | English/Russian UI fragments | 10 interface languages |
| Tests | None | 19 unit tests |

### Install

1. Open `chrome://extensions/`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `TrackMeNot-1.0` folder (unzip the archive first).
5. Open the extension options, choose search engines, and click **Save settings**.

Requires Chrome 120+.

### Your own words in a `.txt` file

In **Custom words and phrases**:

- **Load .txt** — the file is read locally; nothing is uploaded.
- **Download .txt** — export the current list.
- **Share of custom phrases** — 0–100%: how often a query comes from your list instead of the built-in corpus.
- **Clear** — remove the list.

Format: one phrase per line, UTF-8, up to 5,000 lines, up to 200 characters per line. Lines starting with `#` are comments. See [`custom-words.example.txt`](custom-words.example.txt).

### Privacy

- No cookies, no `Cookie` header, no `Referer`.
- No content scripts, no reading pages, no history, no tabs.
- Settings, words, logs and statistics stay in `chrome.storage.local`; no sync, no analytics, no remote code.
- Requests go directly to the selected search engines. Your IP is still visible. Use VPN/Tor and a separate browser profile if you need network anonymity.
- Automated queries may violate search engine terms of service; keep the rate low and do not use this on someone else's account.

More details: [`PRIVACY.md`](PRIVACY.md).

### Development

```bash
npm test
npm run check
```

The tests cover URL building, query selection, `.txt` parsing, scheduling, limits, settings and all 10 language dictionaries. The extension was also loaded as an unpacked Chromium extension for UI checks.

### License and credits

MIT. The idea comes from [TrackMeNot](https://github.com/vtoubiana/TrackMeNot) by Daniel C. Howe, Helen Nissenbaum and Vincent Toubiana. This rewrite is independent and is not affiliated with the original authors, the old Chrome port, or any search engine.

---

## Русский

**Полностью переписанная независимая версия TrackMeNot для Chrome MV3.** Это не патч старого Chrome-порта и не форк Firefox-кода: новый манифест, service worker, планировщик, интерфейс, хранилище и тесты. Сохранена только исходная идея — прятать реальные поисковые интересы среди синтетических запросов.

**Чем лучше оригинальной Chrome-версии:**

- оригинальный порт 0.10.3 — Manifest V2, который современный Chrome уже не запускает;
- здесь нет cookies, `Cookie`-заголовка и `Referer`;
- нет content scripts и доступа ко всем сайтам;
- нет `tabs`, `history`, `webNavigation` и `cookies`;
- нет скрытых вкладок и кликов по выдаче/рекламе;
- частота по умолчанию — 10 минут, есть дневной лимит, активные часы и backoff;
- запросы берутся из локального нейтрального корпуса или вашего `.txt`;
- логи по умолчанию выключены, текст запросов — только по желанию;
- 10 языков интерфейса и 19 тестов.

**Установка:** `chrome://extensions/` → Developer mode → Load unpacked → папка `TrackMeNot-1.0`.

**Свои слова:** раздел «Свои слова и фразы» → «Загрузить .txt» или вставить в поле → «Сохранить». Формат: одна фраза на строку, UTF-8, до 5000 строк и 200 символов; строки с `#` игнорируются. Экспорт — кнопкой «Скачать .txt».

**Приватность:** запросы всё равно уходят с вашего IP на выбранный поисковик. Это не анонимность; для сети используйте VPN/Tor и отдельный профиль. Автоматические запросы могут нарушать правила поисковиков.

Подробная инструкция и ограничения — в [английском разделе](#english) и [`PRIVACY.md`](PRIVACY.md).

---

## Español

**Reescritura independiente y desde cero de TrackMeNot para Chrome MV3.** No es un parche del antiguo port de Chrome ni un fork del código de Firefox: nuevo manifiesto, service worker, planificador, interfaz, almacenamiento y pruebas. Solo se conserva la idea original: ocultar el interés real de búsqueda entre consultas sintéticas.

**Mejor que la versión original de Chrome:**

- el port original 0.10.3 usa Manifest V2 y Chrome actual ya no lo ejecuta;
- sin cookies, cabecera `Cookie` ni `Referer`;
- sin content scripts ni acceso a todos los sitios;
- sin permisos `tabs`, `history`, `webNavigation` o `cookies`;
- sin pestañas ocultas ni clics en resultados/anuncios;
- 10 minutos por defecto, límite diario, horas activas y backoff;
- corpus local neutro o tu propia lista `.txt`;
- registros desactivados por defecto; el texto de las consultas es opcional;
- 10 idiomas de interfaz y 19 pruebas.

**Instalación:** `chrome://extensions/` → modo desarrollador → Load unpacked → carpeta `TrackMeNot-1.0`.

**Palabras propias:** sección «Palabras y frases propias» → «Cargar .txt» o pegar en el campo → «Guardar ajustes». Una frase por línea, UTF-8, hasta 5000 líneas y 200 caracteres; las líneas con `#` se ignoran. Exporta con «Descargar .txt».

**Privacidad:** las solicitudes siguen saliendo de tu IP hacia el buscador elegido. No es anonimato; usa VPN/Tor y un perfil separado. Las consultas automáticas pueden infringir las condiciones del buscador.

Más detalles en la [sección en inglés](#english) y [`PRIVACY.md`](PRIVACY.md).

---

## Português (Brasil)

**Reescrita independente e do zero do TrackMeNot para Chrome MV3.** Não é um patch do antigo port para Chrome nem um fork do código Firefox: novo manifesto, service worker, agendador, interface, armazenamento e testes. Apenas a ideia original foi mantida: esconder o interesse real de busca entre consultas sintéticas.

**Melhor que a versão original do Chrome:**

- o port original 0.10.3 usa Manifest V2, que o Chrome atual não executa;
- sem cookies, cabeçalho `Cookie` ou `Referer`;
- sem content scripts e sem acesso a todos os sites;
- sem permissões `tabs`, `history`, `webNavigation` ou `cookies`;
- sem abas ocultas e sem cliques em resultados/anúncios;
- 10 minutos por padrão, limite diário, horário ativo e backoff;
- corpus local neutro ou sua própria lista `.txt`;
- logs desativados por padrão; texto das consultas é opcional;
- 10 idiomas de interface e 19 testes.

**Instalação:** `chrome://extensions/` → modo desenvolvedor → Load unpacked → pasta `TrackMeNot-1.0`.

**Palavras próprias:** seção «Palavras e frases próprias» → «Carregar .txt» ou colar no campo → «Salvar configurações». Uma frase por linha, UTF-8, até 5000 linhas e 200 caracteres; linhas com `#` são ignoradas. Exporte com «Baixar .txt».

**Privacidade:** as requisições ainda saem do seu IP para o mecanismo escolhido. Isso não é anonimato; use VPN/Tor e um perfil separado. Consultas automáticas podem violar os termos do mecanismo de busca.

Mais detalhes na [seção em inglês](#english) e em [`PRIVACY.md`](PRIVACY.md).

---

## Français

**Réécriture indépendante et complète de TrackMeNot pour Chrome MV3.** Ce n'est ni un patch de l'ancien port Chrome, ni un fork du code Firefox : nouveau manifeste, service worker, planificateur, interface, stockage et tests. Seule l'idée d'origine est conservée : cacher l'intérêt réel de recherche parmi des requêtes synthétiques.

**Meilleur que la version Chrome d'origine :**

- le port original 0.10.3 utilise Manifest V2, que Chrome actuel n'exécute plus ;
- aucun cookie, en-tête `Cookie` ou `Referer` ;
- aucun content script ni accès à tous les sites ;
- aucune permission `tabs`, `history`, `webNavigation` ou `cookies` ;
- aucun onglet caché ni clic sur les résultats/publicités ;
- 10 minutes par défaut, limite quotidienne, heures actives et backoff ;
- corpus local neutre ou votre propre liste `.txt` ;
- journaux désactivés par défaut ; le texte des requêtes est optionnel ;
- 10 langues d'interface et 19 tests.

**Installation :** `chrome://extensions/` → mode développeur → Load unpacked → dossier `TrackMeNot-1.0`.

**Mots personnels :** section « Mots et phrases personnels » → « Charger un .txt » ou coller dans le champ → « Enregistrer les réglages ». Une phrase par ligne, UTF-8, jusqu'à 5000 lignes et 200 caractères ; les lignes avec `#` sont ignorées. Export avec « Télécharger .txt ».

**Confidentialité :** les requêtes partent toujours de votre IP vers le moteur choisi. Ce n'est pas de l'anonymat ; utilisez VPN/Tor et un profil séparé. Les requêtes automatiques peuvent violer les conditions du moteur.

Plus de détails dans la [section anglaise](#english) et [`PRIVACY.md`](PRIVACY.md).

---

## Deutsch

**Unabhängige Neuentwicklung von TrackMeNot für Chrome MV3.** Kein Patch des alten Chrome-Ports und kein Fork des Firefox-Codes: neues Manifest, Service Worker, Planer, Oberfläche, Speichermodell und Tests. Nur die Grundidee bleibt: echtes Suchinteresse in synthetischen Anfragen verstecken.

**Besser als die ursprüngliche Chrome-Version:**

- der alte Port 0.10.3 nutzt Manifest V2 und läuft in aktuellem Chrome nicht mehr;
- keine Cookies, kein `Cookie`-Header, kein `Referer`;
- keine Content Scripts und kein Zugriff auf alle Websites;
- keine Berechtigungen `tabs`, `history`, `webNavigation` oder `cookies`;
- keine versteckten Tabs und keine Klicks auf Ergebnisse/Werbung;
- standardmäßig 10 Minuten, Tageslimit, aktive Stunden und Backoff;
- lokaler neutraler Korpus oder eigene `.txt`-Liste;
- Protokolle standardmäßig aus; Abfragetext optional;
- 10 Oberflächensprachen und 19 Tests.

**Installation:** `chrome://extensions/` → Entwicklermodus → Load unpacked → Ordner `TrackMeNot-1.0`.

**Eigene Wörter:** Bereich „Eigene Wörter und Phrasen“ → „.txt laden“ oder in das Feld einfügen → „Einstellungen speichern“. Eine Phrase pro Zeile, UTF-8, bis 5000 Zeilen und 200 Zeichen; Zeilen mit `#` werden ignoriert. Export über „.txt herunterladen“.

**Datenschutz:** Anfragen gehen weiterhin von Ihrer IP an die gewählte Suchmaschine. Das ist keine Anonymität; nutzen Sie VPN/Tor und ein separates Profil. Automatische Anfragen können gegen die Nutzungsbedingungen verstoßen.

Mehr Details im [englischen Abschnitt](#english) und in [`PRIVACY.md`](PRIVACY.md).

---

## Italiano

**Riscrittura indipendente da zero di TrackMeNot per Chrome MV3.** Non è una patch del vecchio port Chrome né un fork del codice Firefox: nuovo manifest, service worker, scheduler, interfaccia, storage e test. Rimane solo l'idea originale: nascondere l'interesse reale di ricerca tra query sintetiche.

**Meglio della versione Chrome originale:**

- il port originale 0.10.3 usa Manifest V2 e Chrome attuale non lo esegue più;
- nessun cookie, header `Cookie` o `Referer`;
- nessun content script e nessun accesso a tutti i siti;
- nessun permesso `tabs`, `history`, `webNavigation` o `cookies`;
- nessuna scheda nascosta e nessun clic su risultati/annunci;
- 10 minuti predefiniti, limite giornaliero, ore attive e backoff;
- corpus locale neutro o la tua lista `.txt`;
- log disattivati per impostazione predefinita; testo delle query opzionale;
- 10 lingue dell'interfaccia e 19 test.

**Installazione:** `chrome://extensions/` → modalità sviluppatore → Load unpacked → cartella `TrackMeNot-1.0`.

**Parole personali:** sezione «Parole e frasi personali» → «Carica .txt» o incolla nel campo → «Salva impostazioni». Una frase per riga, UTF-8, fino a 5000 righe e 200 caratteri; le righe con `#` vengono ignorate. Esporta con «Scarica .txt».

**Privacy:** le richieste partono comunque dal tuo IP verso il motore scelto. Non è anonimato; usa VPN/Tor e un profilo separato. Le query automatiche possono violare i termini del motore.

Dettagli nella [sezione inglese](#english) e in [`PRIVACY.md`](PRIVACY.md).

---

## 日本語

**Chrome MV3 向けにゼロから書き直した、独立版 TrackMeNot です。** 旧 Chrome 版のパッチでも Firefox コードのフォークでもありません。マニフェスト、Service Worker、スケジューラ、UI、ストレージ、テストを新規に実装し、元のアイデアだけを引き継いでいます。

**元の Chrome 版より優れている点:**

- 旧 0.10.3 は Manifest V2 のため、現在の Chrome では動作しません。
- Cookie、`Cookie` ヘッダー、`Referer` を送信しません。
- Content Script がなく、すべてのサイトへのアクセスもありません。
- `tabs`、`history`、`webNavigation`、`cookies` 権限が不要です。
- 隠しタブや検索結果/広告のクリックはありません。
- 既定 10 分間隔、1 日の上限、アクティブ時間、バックオフを備えています。
- ローカルの中立コーパスまたは自分の `.txt` リストを使えます。
- ログは既定でオフ、クエリ本文の記録は任意です。
- 10 言語の UI と 19 のテスト。

**インストール:** `chrome://extensions/` → デベロッパーモード → Load unpacked → `TrackMeNot-1.0` フォルダー。

**自分の単語:** 「自分の単語とフレーズ」→「.txt を読み込む」または入力欄に貼り付け → 「設定を保存」。1 行に 1 フレーズ、UTF-8、最大 5000 行・200 文字。`#` で始まる行は無視されます。書き出しは「.txt をダウンロード」。

**プライバシー:** リクエストは選択した検索エンジンへあなたの IP から送信されます。匿名化ではありません。VPN/Tor と別プロファイルを使ってください。自動クエリは検索エンジンの利用規約に違反する可能性があります。

詳細は [英語セクション](#english) と [`PRIVACY.md`](PRIVACY.md) を参照してください。

---

## 한국어

**Chrome MV3용으로 처음부터 다시 작성한 독립형 TrackMeNot입니다.** 기존 Chrome 포트의 패치도, Firefox 코드의 포크도 아닙니다. 매니페스트, 서비스 워커, 스케줄러, UI, 저장소, 테스트를 새로 만들고 원래 아이디어만 이어받았습니다.

**기존 Chrome 버전보다 나은 점:**

- 기존 0.10.3은 Manifest V2라 현재 Chrome에서 실행되지 않습니다.
- 쿠키, `Cookie` 헤더, `Referer`를 보내지 않습니다.
- 콘텐츠 스크립트가 없고 모든 사이트에 접근하지 않습니다.
- `tabs`, `history`, `webNavigation`, `cookies` 권한이 필요 없습니다.
- 숨겨진 탭이나 검색 결과/광고 클릭이 없습니다.
- 기본 10분 간격, 일일 한도, 활성 시간, 백오프를 지원합니다.
- 로컬 중립 코퍼스 또는 내 `.txt` 목록을 사용할 수 있습니다.
- 로그는 기본적으로 꺼져 있고, 검색어 텍스트 기록은 선택 사항입니다.
- 10개 UI 언어와 19개 테스트.

**설치:** `chrome://extensions/` → 개발자 모드 → Load unpacked → `TrackMeNot-1.0` 폴더.

**내 단어:** «내 단어와 문구» → «.txt 불러오기» 또는 입력란에 붙여넣기 → «설정 저장». 한 줄에 한 문구, UTF-8, 최대 5000줄·200자. `#`로 시작하는 줄은 무시됩니다. 내보내기는 «.txt 다운로드».

**개인정보:** 요청은 선택한 검색 엔진으로 내 IP에서 전송됩니다. 익명성이 아닙니다. VPN/Tor와 별도 프로필을 사용하세요. 자동 검색은 검색 엔진 약관을 위반할 수 있습니다.

자세한 내용은 [영어 섹션](#english)과 [`PRIVACY.md`](PRIVACY.md)를 참고하세요.

---

## 简体中文

**面向 Chrome MV3 从零重写的独立版 TrackMeNot。** 它不是旧 Chrome 版本的补丁，也不是 Firefox 代码的分支。清单、Service Worker、调度器、界面、存储和测试都是新写的，只保留了最初的理念。

**相比原 Chrome 版本的改进：**

- 旧版 0.10.3 使用 Manifest V2，当前 Chrome 已无法运行；
- 不发送 Cookie、`Cookie` 请求头或 `Referer`；
- 没有内容脚本，也不会访问所有网站；
- 不需要 `tabs`、`history`、`webNavigation` 或 `cookies` 权限；
- 没有隐藏标签页，也不会点击搜索结果或广告；
- 默认 10 分钟一次，支持每日上限、活动时间和退避；
- 使用本地中性语料或你自己的 `.txt` 列表；
- 日志默认关闭，查询文本记录可选；
- 10 种界面语言和 19 项测试。

**安装：** `chrome://extensions/` → 开发者模式 → Load unpacked → 选择 `TrackMeNot-1.0` 文件夹。

**自定义词语：** 在“自定义词语和短语”中点击“加载 .txt”或直接粘贴到输入框，然后“保存设置”。每行一个短语，UTF-8，最多 5000 行、每行 200 字符；以 `#` 开头的行会被忽略。用“下载 .txt”导出。

**隐私：** 请求仍会从你的 IP 发往所选搜索引擎。这不是匿名；请使用 VPN/Tor 和单独的浏览器配置。自动查询可能违反搜索引擎的服务条款。

更多细节见 [英文部分](#english) 和 [`PRIVACY.md`](PRIVACY.md)。

---

## Repository notes

- Project name: **TrackMeNot 1.0**
- Rewritten from scratch; independent implementation.
- Original idea and credits: Daniel C. Howe, Helen Nissenbaum, Vincent Toubiana.
- Not affiliated with search engines or the original project.
- License: MIT.
