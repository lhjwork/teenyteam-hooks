# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Um hook minúsculo do Claude Code que registra o que seus subagentes estão fazendo (quem começou, quem ainda está trabalhando, quem terminou e quando uma sessão está esperando sua aprovação) como linhas JSON simples na sua máquina.

Ele é a parte aberta do [Tinyfloor](https://tinyfloor-landing.vercel.app/), um pequeno painel sempre visível para o canto da tela (em desenvolvimento, ainda não lançado). O registrador e o formato de eventos são úteis sozinhos: use `tail -f` no arquivo, envie para o seu próprio painel ou construa algo melhor.

> Status: protótipo. Testado no **macOS** com o Claude Code 2.1.289. O Windows ainda não foi testado. Os campos de `Notification` ainda não foram confirmados.

## O que ele faz

- Escuta `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` e `Notification`.
- Acrescenta uma linha por evento em `~/.tinyfloor/events.jsonl` e salva a mensagem final de cada subagente em `~/.tinyfloor/reports/*.md`.
- Associa início e fim por `agent_id`, não pela ordem: a ordem dos hooks varia e os subagentes rodam em paralelo ou em segundo plano.
- Ignora campos desconhecidos e **sempre termina com exit 0**, então nunca pode bloquear o Claude Code.
- Sem dependências, sem rede. Nada sai da sua máquina.

## Instalação

Precisa do Node.js (quem usa o Claude Code geralmente já tem). Copie `hooks/log.js` para o seu projeto e adicione isto a `.claude/settings.local.json` (ou `settings.json`):

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

Execute um subagente e depois `tail -f ~/.tinyfloor/events.jsonl`.

Autoteste com as entradas reais de hooks em `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Formato de evento (`events.jsonl`, um objeto JSON por linha)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Origem | Significado |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Subagente chamado. `id` = `tool_use_id`, `agent` = `subagent_type` (padrão `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Rodou em primeiro plano e já terminou |
| `launched` | `PostToolUse`, `status = "async_launched"` | Começou em segundo plano. Liga `id` a `agent_id` |
| `stop` | `SubagentStop` | O subagente terminou. `report` aponta para a mensagem final salva |
| `waiting` | `Notification` | A sessão está esperando por você (campos ainda não confirmados) |

Campos comuns: `v` (versão do formato), `t` (hora ISO), `project` (`cwd`), `session`, `cc` (versão do Claude Code vinda da variável de ambiente não documentada `AI_AGENT`; caso contrário, `null`).

Quem está trabalhando agora = `reduce(events)` em `hooks/log.js`. Observações a partir de entradas reais:

- A ordem dos hooks varia: `SubagentStop` pode chegar antes de `PostToolUse`.
- Um subagente pode ir para segundo plano mesmo sem `run_in_background`; confira `tool_response.status`.
- `SubagentStart` fornece `agent_id`, mas não `tool_use_id`, então não é usado.

## Modelo de vaga de emprego para subagentes

`templates/job-posting.md` é um modelo para `.claude/agents/*.md`: qual é o trabalho, como é um trabalho bem feito, quais ferramentas e o que o agente pode fazer sozinho e o que deve perguntar antes. Um subagente com uma descrição de cargo clara é mais fácil de confiar e de acompanhar.

## Licença

MIT. O Tinyfloor é um projeto independente, sem afiliação com a Anthropic.
