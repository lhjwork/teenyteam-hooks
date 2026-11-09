# TeenyTeam hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Un tout petit hook Claude Code qui consigne ce que font vos sous-agents (qui a démarré, qui travaille encore, qui a terminé, et quand une session attend votre approbation) sous forme de simples lignes JSON sur votre machine.

C'est la partie ouverte de [TeenyTeam](https://landing.teenyteam.com/), un petit panneau toujours visible pour le coin de votre écran (en développement, pas encore sorti). Le journal et le format d'événements sont utiles seuls : faites un `tail -f` sur le fichier, envoyez-le à votre propre tableau de bord, ou construisez mieux.

> Statut : prototype. Vérifié sous **macOS** avec Claude Code 2.1.289. Windows n'est pas encore vérifié. Les champs de `Notification` ne sont pas encore confirmés.

## Ce qu'il fait

- Écoute `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` et `Notification`.
- Ajoute une ligne par événement à `~/.teenyteam/events.jsonl` et enregistre le message final de chaque sous-agent dans `~/.teenyteam/reports/*.md`.
- Associe début et fin par `agent_id`, pas par ordre : l'ordre des hooks varie et les sous-agents tournent en parallèle ou en arrière-plan.
- Ignore les champs inconnus et **termine toujours avec exit 0**, donc il ne peut jamais bloquer Claude Code.
- Aucune dépendance, aucun réseau. Rien ne quitte votre machine.

## Installation

Nécessite Node.js (les utilisateurs de Claude Code l'ont généralement). Copiez `hooks/log.js` dans votre projet, puis ajoutez ceci à `.claude/settings.local.json` (ou `settings.json`) :

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

Lancez un sous-agent, puis `tail -f ~/.teenyteam/events.jsonl`.

Autotest avec les vraies entrées de hooks de `hooks/fixtures/` :

```sh
node hooks/log.js --test   # prints "ok"
```

## Format des événements (`events.jsonl`, un objet JSON par ligne)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Origine | Signification |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Sous-agent appelé. `id` = `tool_use_id`, `agent` = `subagent_type` (par défaut `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | S'est exécuté au premier plan et est déjà terminé |
| `launched` | `PostToolUse`, `status = "async_launched"` | Démarré en arrière-plan. Relie `id` à `agent_id` |
| `stop` | `SubagentStop` | Le sous-agent a terminé. `report` pointe vers le message final enregistré |
| `waiting` | `Notification` | La session vous attend (champs pas encore confirmés) |

Champs communs : `v` (version du format), `t` (heure ISO), `project` (`cwd`), `session`, `cc` (version de Claude Code issue de la variable d'environnement non documentée `AI_AGENT`, sinon `null`).

Qui travaille en ce moment = `reduce(events)` dans `hooks/log.js`. Remarques tirées d'entrées réelles :

- L'ordre des hooks varie : `SubagentStop` peut arriver avant `PostToolUse`.
- Un sous-agent peut passer en arrière-plan même sans `run_in_background` ; vérifiez `tool_response.status`.
- `SubagentStart` fournit `agent_id` mais pas `tool_use_id`, il n'est donc pas utilisé.

## Modèle d'offre d'emploi pour sous-agents

`templates/job-posting.md` est un modèle pour `.claude/agents/*.md` : en quoi consiste le travail, à quoi ressemble un travail bien fait, quels outils, et ce que l'agent peut faire seul ou doit demander d'abord. Un sous-agent avec une fiche de poste claire inspire plus de confiance et se suit plus facilement.

## Licence

MIT. TeenyTeam est un projet indépendant, non affilié à Anthropic.
