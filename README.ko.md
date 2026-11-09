# TeenyTeam hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

서브에이전트가 무엇을 하는지(누가 시작했는지, 누가 아직 일하는 중인지, 누가 끝냈는지, 세션이 승인을 기다리는 때가 언제인지)를 내 컴퓨터에 일반 JSON 줄로 기록하는 작은 Claude Code hook이에요.

화면 구석에 늘 떠 있는 작은 패널 [TeenyTeam](https://landing.teenyteam.com/)의 오픈 소스 부분이에요(개발 중, 아직 출시 전). 기록기와 이벤트 형식은 그것만으로도 쓸모가 있어요. 파일에 `tail -f`를 걸거나, 직접 만든 대시보드에 넘기거나, 더 좋은 걸 만들어 보세요.

> 상태: 시제품. **macOS**에서 Claude Code 2.1.289로 확인했어요. Windows는 아직 확인하지 않았어요. `Notification` 필드도 아직 확인하지 않았어요.

## 하는 일

- `PreToolUse` / `PostToolUse`(matcher `Agent`), `SubagentStop`, `Notification`을 들어요.
- 이벤트마다 한 줄씩 `~/.teenyteam/events.jsonl`에 덧붙이고, 각 서브에이전트의 마지막 메시지를 `~/.teenyteam/reports/*.md`에 저장해요.
- 시작과 끝을 순서가 아니라 `agent_id`로 짝지어요. hook 순서는 일정하지 않고, 서브에이전트는 병렬이나 백그라운드로 돌기 때문이에요.
- 모르는 필드는 무시하고 **항상 exit 0**으로 끝나서, Claude Code를 막을 일이 없어요.
- 의존성 없음, 네트워크 없음. 내 컴퓨터 밖으로 나가는 건 없어요.

## 설치

Node.js가 필요해요(Claude Code 사용자는 보통 이미 있어요). `hooks/log.js`를 프로젝트에 복사하고, `.claude/settings.local.json`(또는 `settings.json`)에 아래를 추가하세요.

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

서브에이전트를 한 번 돌린 뒤 `tail -f ~/.teenyteam/events.jsonl`을 실행해 보세요.

`hooks/fixtures/`에 있는 실제 hook 입력으로 자체 점검을 할 수 있어요.

```sh
node hooks/log.js --test   # prints "ok"
```

## 이벤트 형식 (`events.jsonl`, 한 줄에 JSON 객체 하나)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | 출처 | 뜻 |
|---|---|---|
| `start` | `PreToolUse` (Agent) | 서브에이전트를 불렀어요. `id` = `tool_use_id`, `agent` = `subagent_type`(기본값 `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | 포그라운드에서 돌아 이미 끝났어요 |
| `launched` | `PostToolUse`, `status = "async_launched"` | 백그라운드에서 시작했어요. `id`와 `agent_id`를 이어 줘요 |
| `stop` | `SubagentStop` | 서브에이전트가 끝났어요. `report`는 저장된 마지막 메시지를 가리켜요 |
| `waiting` | `Notification` | 세션이 나를 기다리고 있어요(필드는 아직 확인 전) |

공통 필드: `v`(형식 버전), `t`(ISO 시각), `project`(`cwd`), `session`, `cc`(문서화되지 않은 `AI_AGENT` 환경 변수에서 가져온 Claude Code 버전, 없으면 `null`).

지금 누가 일하는지는 `hooks/log.js`의 `reduce(events)`로 구해요. 실제 입력에서 알게 된 점:

- hook 순서는 일정하지 않아요. `SubagentStop`이 `PostToolUse`보다 먼저 올 수 있어요.
- `run_in_background`가 없어도 서브에이전트가 백그라운드로 갈 수 있어요. `tool_response.status`를 확인하세요.
- `SubagentStart`는 `agent_id`는 주지만 `tool_use_id`는 주지 않아서 쓰지 않아요.

## 서브에이전트용 채용 공고 템플릿

`templates/job-posting.md`는 `.claude/agents/*.md`용 템플릿이에요. 무슨 일인지, "잘했다"는 게 어떤 모습인지, 어떤 도구를 쓰는지, 혼자 해도 되는 일과 먼저 물어봐야 하는 일이 무엇인지를 적어요. 업무 설명이 분명한 서브에이전트는 믿기도, 지켜보기도 쉬워요.

## 라이선스

MIT. TeenyTeam은 독립 프로젝트이며 Anthropic과 관련이 없어요.
