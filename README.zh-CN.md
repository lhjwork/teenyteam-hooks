# TeenyTeam hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

一个很小的 Claude Code hook,把你的 subagent 在做什么(谁开始了、谁还在工作、谁完成了、会话何时在等你批准)以纯 JSON 行的形式记录在你自己的电脑上。

它是 [TeenyTeam](https://landing.teenyteam.com/) 的开源部分。TeenyTeam 是一个常驻在屏幕角落的小面板(开发中,尚未发布)。记录器和事件格式本身就有用:对文件 `tail -f`、喂给你自己的看板,或者做出更好的东西。

> 状态:原型。已在 **macOS** 上用 Claude Code 2.1.289 验证。Windows 尚未验证。`Notification` 的字段尚未确认。

## 它做什么

- 监听 `PreToolUse` / `PostToolUse`(matcher 为 `Agent`)、`SubagentStop` 和 `Notification`。
- 每个事件向 `~/.teenyteam/events.jsonl` 追加一行,并把每个 subagent 的最后一条消息保存到 `~/.teenyteam/reports/*.md`。
- 用 `agent_id` 而不是顺序来配对开始和结束,因为 hook 的顺序不固定,subagent 还可能并行或在后台运行。
- 忽略未知字段,并且**始终以 exit 0 退出**,所以绝不会阻塞 Claude Code。
- 无依赖,不联网。任何内容都不会离开你的电脑。

## 安装

需要 Node.js(Claude Code 用户通常已经装了)。把 `hooks/log.js` 复制到你的项目里,然后把下面的内容加到 `.claude/settings.local.json`(或 `settings.json`):

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

运行一个 subagent,然后执行 `tail -f ~/.teenyteam/events.jsonl`。

用 `hooks/fixtures/` 里的真实 hook 输入做自检:

```sh
node hooks/log.js --test   # prints "ok"
```

## 事件格式(`events.jsonl`,每行一个 JSON 对象)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | 来源 | 含义 |
|---|---|---|
| `start` | `PreToolUse` (Agent) | subagent 被调用。`id` = `tool_use_id`,`agent` = `subagent_type`(默认 `general-purpose`),`task` = `description` |
| `done` | `PostToolUse`,`tool_response.status = "completed"` | 在前台运行,并且已经完成 |
| `launched` | `PostToolUse`,`status = "async_launched"` | 在后台启动。把 `id` 和 `agent_id` 关联起来 |
| `stop` | `SubagentStop` | subagent 已完成。`report` 指向保存下来的最后一条消息 |
| `waiting` | `Notification` | 会话在等你(字段尚未确认) |

公共字段:`v`(格式版本)、`t`(ISO 时间)、`project`(`cwd`)、`session`、`cc`(来自未公开文档的环境变量 `AI_AGENT` 的 Claude Code 版本,否则为 `null`)。

现在谁在工作 = `hooks/log.js` 里的 `reduce(events)`。来自真实输入的说明:

- hook 顺序不固定:`SubagentStop` 可能先于 `PostToolUse` 到达。
- 即使没有 `run_in_background`,subagent 也可能转到后台;请检查 `tool_response.status`。
- `SubagentStart` 提供 `agent_id` 但没有 `tool_use_id`,所以不使用它。

## 给 subagent 的招聘启事模板

`templates/job-posting.md` 是 `.claude/agents/*.md` 的模板:工作是什么、做好是什么样子、用哪些工具,以及 agent 哪些事可以自己做、哪些必须先问。职责写得清楚的 subagent 更容易信任,也更容易观察。

## 许可证

MIT。TeenyTeam 是独立项目,与 Anthropic 无关。
