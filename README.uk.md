# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Крихітний хук для Claude Code, який записує, що роблять твої субагенти (хто почав, хто ще працює, хто закінчив і коли сесія чекає твого підтвердження), у вигляді звичайних рядків JSON на твоєму комп'ютері.

Це відкрита частина [Tinyfloor](https://tinyfloor-landing.vercel.app/), невеликої панелі, яка завжди в кутку екрана (у розробці, ще не вийшла). Логер і формат подій корисні й самі по собі: запусти `tail -f` на файлі, передай його власному дашборду або зроби щось краще.

> Статус: прототип. Перевірено на **macOS** з Claude Code 2.1.289. Windows ще не перевірено. Поля `Notification` ще не підтверджено.

## Що він робить

- Слухає `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` і `Notification`.
- Дописує по одному рядку на подію в `~/.tinyfloor/events.jsonl` і зберігає останнє повідомлення кожного субагента в `~/.tinyfloor/reports/*.md`.
- Зіставляє початок і кінець за `agent_id`, а не за порядком: порядок хуків змінюється, а субагенти працюють паралельно або у фоні.
- Ігнорує невідомі поля й **завжди завершується з exit 0**, тож ніколи не заблокує Claude Code.
- Без залежностей і без мережі. Ніщо не залишає твій комп'ютер.

## Встановлення

Потрібен Node.js (у користувачів Claude Code він зазвичай уже є). Скопіюй `hooks/log.js` у свій проєкт і додай це до `.claude/settings.local.json` (або `settings.json`):

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

Запусти субагента, потім виконай `tail -f ~/.tinyfloor/events.jsonl`.

Самоперевірка на реальних вхідних даних хуків із `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Формат подій (`events.jsonl`, один JSON-об'єкт на рядок)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Звідки | Значення |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Субагента викликано. `id` = `tool_use_id`, `agent` = `subagent_type` (за замовчуванням `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Працював на передньому плані й уже закінчив |
| `launched` | `PostToolUse`, `status = "async_launched"` | Запущено у фоні. Зв'язує `id` з `agent_id` |
| `stop` | `SubagentStop` | Субагент закінчив. `report` вказує на збережене останнє повідомлення |
| `waiting` | `Notification` | Сесія чекає на тебе (поля ще не підтверджено) |

Спільні поля: `v` (версія формату), `t` (час у ISO), `project` (`cwd`), `session`, `cc` (версія Claude Code з недокументованої змінної середовища `AI_AGENT`, інакше `null`).

Хто працює просто зараз = `reduce(events)` у `hooks/log.js`. Спостереження за реальними вхідними даними:

- Порядок хуків змінюється: `SubagentStop` може прийти раніше за `PostToolUse`.
- Субагент може піти у фон навіть без `run_in_background`; перевіряй `tool_response.status`.
- `SubagentStart` дає `agent_id`, але не `tool_use_id`, тому не використовується.

## Шаблон вакансії для субагентів

`templates/job-posting.md` - шаблон для `.claude/agents/*.md`: у чому робота, як виглядає добре виконана робота, які інструменти, що агент може робити сам, а про що має спершу спитати. Субагенту з чіткою посадовою інструкцією легше довіряти й легше за ним спостерігати.

## Ліцензія

MIT. Tinyfloor - незалежний проєкт, не пов'язаний з Anthropic.
