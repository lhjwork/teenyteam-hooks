# TeenyTeam hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Крошечный хук для Claude Code, который записывает, что делают твои субагенты (кто начал, кто ещё работает, кто закончил и когда сессия ждёт твоего подтверждения), в виде обычных строк JSON на твоём компьютере.

Это открытая часть [TeenyTeam](https://landing.teenyteam.com/), небольшой панели, которая всегда в углу экрана (в разработке, ещё не вышла). Логгер и формат событий полезны и сами по себе: запусти `tail -f` на файле, передай его своему дашборду или сделай что-нибудь лучше.

> Статус: прототип. Проверено на **macOS** с Claude Code 2.1.289. Windows пока не проверен. Поля `Notification` пока не подтверждены.

## Что он делает

- Слушает `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` и `Notification`.
- Дописывает по одной строке на событие в `~/.teenyteam/events.jsonl` и сохраняет последнее сообщение каждого субагента в `~/.teenyteam/reports/*.md`.
- Сопоставляет начало и конец по `agent_id`, а не по порядку: порядок хуков меняется, а субагенты работают параллельно или в фоне.
- Игнорирует неизвестные поля и **всегда завершается с exit 0**, поэтому никогда не заблокирует Claude Code.
- Без зависимостей и без сети. Ничего не покидает твой компьютер.

## Установка

Нужен Node.js (у пользователей Claude Code он обычно уже есть). Скопируй `hooks/log.js` в свой проект и добавь это в `.claude/settings.local.json` (или `settings.json`):

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

Запусти субагента, затем выполни `tail -f ~/.teenyteam/events.jsonl`.

Самопроверка на реальных входных данных хуков из `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Формат событий (`events.jsonl`, один JSON-объект на строку)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Откуда | Значение |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Субагент вызван. `id` = `tool_use_id`, `agent` = `subagent_type` (по умолчанию `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Работал на переднем плане и уже закончил |
| `launched` | `PostToolUse`, `status = "async_launched"` | Запущен в фоне. Связывает `id` с `agent_id` |
| `stop` | `SubagentStop` | Субагент закончил. `report` указывает на сохранённое последнее сообщение |
| `waiting` | `Notification` | Сессия ждёт тебя (поля пока не подтверждены) |

Общие поля: `v` (версия формата), `t` (время в ISO), `project` (`cwd`), `session`, `cc` (версия Claude Code из недокументированной переменной окружения `AI_AGENT`, иначе `null`).

Кто работает прямо сейчас = `reduce(events)` в `hooks/log.js`. Наблюдения по реальным входным данным:

- Порядок хуков меняется: `SubagentStop` может прийти раньше `PostToolUse`.
- Субагент может уйти в фон даже без `run_in_background`; проверяй `tool_response.status`.
- `SubagentStart` даёт `agent_id`, но не `tool_use_id`, поэтому не используется.

## Шаблон вакансии для субагентов

`templates/job-posting.md` - шаблон для `.claude/agents/*.md`: в чём работа, как выглядит хорошо сделанная работа, какие инструменты, что агент может делать сам, а о чём должен сначала спросить. Субагенту с чёткой должностной инструкцией проще доверять и проще за ним наблюдать.

## Лицензия

MIT. TeenyTeam - независимый проект, не связанный с Anthropic.
