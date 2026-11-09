# TeenyTeam hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Ein winziger Claude-Code-Hook, der protokolliert, was deine Subagenten gerade tun: wer gestartet ist, wer noch arbeitet, wer fertig ist und wann eine Sitzung auf deine Freigabe wartet. Als einfache JSON-Zeilen auf deinem Rechner.

Er ist der offene Teil von [TeenyTeam](https://landing.teenyteam.com/), einem kleinen, immer sichtbaren Panel für die Bildschirmecke (in Entwicklung, noch nicht veröffentlicht). Der Logger und das Eventformat sind auch allein nützlich: `tail -f` auf die Datei, an ein eigenes Dashboard weiterreichen oder etwas Besseres bauen.

> Status: Prototyp. Geprüft unter **macOS** mit Claude Code 2.1.289. Windows ist noch nicht geprüft. Die `Notification`-Felder sind noch nicht bestätigt.

## Was er macht

- Hört auf `PreToolUse` / `PostToolUse` (Matcher `Agent`), `SubagentStop` und `Notification`.
- Hängt pro Event eine Zeile an `~/.teenyteam/events.jsonl` an und speichert die letzte Nachricht jedes Subagenten in `~/.teenyteam/reports/*.md`.
- Ordnet Start und Ende über `agent_id` zu, nicht über die Reihenfolge: Die Hook-Reihenfolge schwankt, und Subagenten laufen parallel oder im Hintergrund.
- Ignoriert unbekannte Felder und beendet sich **immer mit exit 0**, kann Claude Code also nie blockieren.
- Keine Abhängigkeiten, kein Netzwerk. Nichts verlässt deinen Rechner.

## Installation

Benötigt Node.js (Claude-Code-Nutzer haben es meist schon). Kopiere `hooks/log.js` in dein Projekt und füge dies in `.claude/settings.local.json` (oder `settings.json`) ein:

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

Starte einen Subagenten und führe dann `tail -f ~/.teenyteam/events.jsonl` aus.

Selbsttest mit den echten Hook-Eingaben in `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Eventformat (`events.jsonl`, ein JSON-Objekt pro Zeile)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Quelle | Bedeutung |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Subagent aufgerufen. `id` = `tool_use_id`, `agent` = `subagent_type` (Standard `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Lief im Vordergrund und ist bereits fertig |
| `launched` | `PostToolUse`, `status = "async_launched"` | Im Hintergrund gestartet. Verknüpft `id` mit `agent_id` |
| `stop` | `SubagentStop` | Subagent ist fertig. `report` zeigt auf die gespeicherte letzte Nachricht |
| `waiting` | `Notification` | Sitzung wartet auf dich (Felder noch nicht bestätigt) |

Gemeinsame Felder: `v` (Formatversion), `t` (ISO-Zeit), `project` (`cwd`), `session`, `cc` (Claude-Code-Version aus der undokumentierten Umgebungsvariable `AI_AGENT`, sonst `null`).

Wer gerade arbeitet = `reduce(events)` in `hooks/log.js`. Beobachtungen aus echten Eingaben:

- Die Hook-Reihenfolge schwankt: `SubagentStop` kann vor `PostToolUse` ankommen.
- Ein Subagent kann auch ohne `run_in_background` in den Hintergrund wechseln; prüfe `tool_response.status`.
- `SubagentStart` liefert `agent_id`, aber keine `tool_use_id`, daher wird es nicht verwendet.

## Stellenanzeige als Vorlage für Subagenten

`templates/job-posting.md` ist eine Vorlage für `.claude/agents/*.md`: Was die Aufgabe ist, woran man gute Arbeit erkennt, welche Tools erlaubt sind und was der Agent allein tun darf und wo er erst nachfragen muss. Einem Subagenten mit klarer Stellenbeschreibung vertraut man leichter, und man kann ihm leichter zusehen.

## Lizenz

MIT. TeenyTeam ist ein unabhängiges Projekt und steht in keiner Verbindung zu Anthropic.
