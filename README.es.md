# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Un hook diminuto de Claude Code que registra lo que hacen tus subagentes (quién empezó, quién sigue trabajando, quién terminó y cuándo una sesión espera tu aprobación) como líneas JSON simples en tu máquina.

Es la parte abierta de [Tinyfloor](https://tinyfloor-landing.vercel.app/), un pequeño panel siempre visible para la esquina de tu pantalla (en desarrollo, aún sin lanzar). El registrador y el formato de eventos sirven por sí solos: haz `tail -f` al archivo, pásalo a tu propio panel o construye algo mejor.

> Estado: prototipo. Probado en **macOS** con Claude Code 2.1.289. Windows aún no se ha probado. Los campos de `Notification` aún no están confirmados.

## Qué hace

- Escucha `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` y `Notification`.
- Añade una línea por evento a `~/.tinyfloor/events.jsonl` y guarda el mensaje final de cada subagente en `~/.tinyfloor/reports/*.md`.
- Empareja inicio y fin por `agent_id`, no por orden: el orden de los hooks varía y los subagentes se ejecutan en paralelo o en segundo plano.
- Ignora los campos desconocidos y **siempre termina con exit 0**, así que nunca puede bloquear Claude Code.
- Sin dependencias y sin red. Nada sale de tu máquina.

## Instalación

Necesita Node.js (los usuarios de Claude Code suelen tenerlo). Copia `hooks/log.js` en tu proyecto y añade esto a `.claude/settings.local.json` (o `settings.json`):

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

Ejecuta un subagente y luego `tail -f ~/.tinyfloor/events.jsonl`.

Autocomprobación con las entradas reales de hooks de `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Formato de eventos (`events.jsonl`, un objeto JSON por línea)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Origen | Significado |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Subagente invocado. `id` = `tool_use_id`, `agent` = `subagent_type` (por defecto `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Se ejecutó en primer plano y ya terminó |
| `launched` | `PostToolUse`, `status = "async_launched"` | Se inició en segundo plano. Enlaza `id` con `agent_id` |
| `stop` | `SubagentStop` | El subagente terminó. `report` apunta al mensaje final guardado |
| `waiting` | `Notification` | La sesión te está esperando (campos aún sin confirmar) |

Campos comunes: `v` (versión del formato), `t` (hora ISO), `project` (`cwd`), `session`, `cc` (versión de Claude Code tomada de la variable de entorno no documentada `AI_AGENT`; si no, `null`).

Quién trabaja ahora mismo = `reduce(events)` en `hooks/log.js`. Notas a partir de entradas reales:

- El orden de los hooks varía: `SubagentStop` puede llegar antes que `PostToolUse`.
- Un subagente puede pasar a segundo plano incluso sin `run_in_background`; comprueba `tool_response.status`.
- `SubagentStart` da `agent_id` pero no `tool_use_id`, así que no se usa.

## Plantilla de oferta de empleo para subagentes

`templates/job-posting.md` es una plantilla para `.claude/agents/*.md`: en qué consiste el trabajo, cómo se ve un trabajo bien hecho, qué herramientas usa y qué puede hacer el agente por su cuenta y qué debe consultar antes. Un subagente con una descripción de puesto clara es más fácil de confiar y de observar.

## Licencia

MIT. Tinyfloor es un proyecto independiente, sin afiliación con Anthropic.
