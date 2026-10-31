# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Malutki hook do Claude Code, który zapisuje, co robią twoje subagenty (kto wystartował, kto jeszcze pracuje, kto skończył i kiedy sesja czeka na twoją zgodę) jako zwykłe linie JSON na twoim komputerze.

To otwarta część [Tinyfloor](https://tinyfloor-landing.vercel.app/), małego panelu, który cały czas jest w rogu ekranu (w trakcie tworzenia, jeszcze niewydany). Logger i format zdarzeń przydadzą się także osobno: puść `tail -f` na plik, podaj go własnemu dashboardowi albo zbuduj coś lepszego.

> Status: prototyp. Sprawdzony na **macOS** z Claude Code 2.1.289. Windows nie został jeszcze sprawdzony. Pola `Notification` nie są jeszcze potwierdzone.

## Co robi

- Nasłuchuje `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` i `Notification`.
- Dopisuje jedną linię na zdarzenie do `~/.tinyfloor/events.jsonl` i zapisuje ostatnią wiadomość każdego subagenta w `~/.tinyfloor/reports/*.md`.
- Paruje start i koniec po `agent_id`, a nie po kolejności: kolejność hooków bywa różna, a subagenty działają równolegle lub w tle.
- Ignoruje nieznane pola i **zawsze kończy z exit 0**, więc nigdy nie zablokuje Claude Code.
- Bez zależności, bez sieci. Nic nie opuszcza twojego komputera.

## Instalacja

Wymaga Node.js (użytkownicy Claude Code zwykle go mają). Skopiuj `hooks/log.js` do projektu i dodaj to do `.claude/settings.local.json` (albo `settings.json`):

```json
{
  "hooks": {
    "PreToolUse":   [{ "matcher": "Agent", "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/hooks/log.js\"" }] }],
    "PostToolUse":  [{ "matcher": "Agent", "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/hooks/log.js\"" }] }],
    "SubagentStop": [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/hooks/log.js\"" }] }],
    "Notification": [{ "hooks": [{ "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/hooks/log.js\"" }] }]
  }
}
```

Uruchom subagenta, a potem `tail -f ~/.tinyfloor/events.jsonl`.

Autotest na prawdziwych danych wejściowych hooków z `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Format zdarzeń (`events.jsonl`, jeden obiekt JSON w linii)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Źródło | Znaczenie |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Wywołano subagenta. `id` = `tool_use_id`, `agent` = `subagent_type` (domyślnie `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Działał na pierwszym planie i już skończył |
| `launched` | `PostToolUse`, `status = "async_launched"` | Wystartował w tle. Łączy `id` z `agent_id` |
| `stop` | `SubagentStop` | Subagent skończył. `report` wskazuje zapisaną ostatnią wiadomość |
| `waiting` | `Notification` | Sesja czeka na ciebie (pola jeszcze niepotwierdzone) |

Pola wspólne: `v` (wersja formatu), `t` (czas ISO), `project` (`cwd`), `session`, `cc` (wersja Claude Code z nieudokumentowanej zmiennej środowiskowej `AI_AGENT`, w przeciwnym razie `null`).

Kto pracuje w tej chwili = `reduce(events)` w `hooks/log.js`. Uwagi z prawdziwych danych:

- Kolejność hooków bywa różna: `SubagentStop` może dotrzeć przed `PostToolUse`.
- Subagent może przejść w tło nawet bez `run_in_background`; sprawdzaj `tool_response.status`.
- `SubagentStart` podaje `agent_id`, ale nie `tool_use_id`, więc nie jest używany.

## Szablon ogłoszenia o pracę dla subagentów

`templates/job-posting.md` to szablon dla `.claude/agents/*.md`: na czym polega praca, jak wygląda dobrze wykonane zadanie, jakich narzędzi agent używa oraz co może zrobić sam, a o co musi najpierw zapytać. Subagentowi z jasnym opisem stanowiska łatwiej zaufać i łatwiej go obserwować.

## Licencja

MIT. Tinyfloor to niezależny projekt, niezwiązany z Anthropic.
