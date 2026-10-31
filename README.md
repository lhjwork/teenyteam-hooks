# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

A tiny Claude Code hook that logs what your subagents are doing — who started, who is still working, who finished, and when a session is waiting for your approval — as plain JSON lines on your machine.

It is the open part of [Tinyfloor](https://tinyfloor-landing.vercel.app/), a small always-on panel for the corner of your screen (in development, not released yet). The logger and the event format are useful on their own: `tail -f` the file, feed it to your own dashboard, or build something better.

> Status: prototype. Checked on **macOS** with Claude Code 2.1.289. Windows is not checked yet. The `Notification` fields are not confirmed yet.

## What it does

- Listens to `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` and `Notification`.
- Appends one line per event to `~/.tinyfloor/events.jsonl` and saves each subagent's final message to `~/.tinyfloor/reports/*.md`.
- Pairs start and end by `agent_id`, not by order — hook order varies and subagents run in parallel or in the background.
- Ignores unknown fields and **always exits 0**, so it can never block Claude Code.
- No dependencies, no network. Nothing leaves your machine.

## Install

Needs Node.js (Claude Code users usually have it). Copy `hooks/log.js` into your project, then add this to `.claude/settings.local.json` (or `settings.json`):

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

Run a subagent, then `tail -f ~/.tinyfloor/events.jsonl`.

Self-check against the real hook inputs in `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Event format (`events.jsonl`, one JSON object per line)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | From | Meaning |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Subagent called. `id` = `tool_use_id`, `agent` = `subagent_type` (default `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Ran in the foreground and already finished |
| `launched` | `PostToolUse`, `status = "async_launched"` | Started in the background. Links `id` to `agent_id` |
| `stop` | `SubagentStop` | Subagent finished. `report` points to the saved final message |
| `waiting` | `Notification` | Session waiting for you (fields not confirmed yet) |

Common fields: `v` (format version), `t` (ISO time), `project` (`cwd`), `session`, `cc` (Claude Code version from the undocumented `AI_AGENT` env var, else `null`).

Who is working right now = `reduce(events)` in `hooks/log.js`. Notes from real inputs:

- Hook order varies: `SubagentStop` can arrive before `PostToolUse`.
- A subagent can go to the background even without `run_in_background`; check `tool_response.status`.
- `SubagentStart` gives `agent_id` but no `tool_use_id`, so it is not used.

## Job posting template for subagents

`templates/job-posting.md` is a template for `.claude/agents/*.md`: what the job is, what "done well" looks like, which tools, and what the agent may do alone vs. must ask first. Subagents with a clear job description are easier to trust and easier to watch.

## License

MIT. Tinyfloor is an independent project, not affiliated with Anthropic.
