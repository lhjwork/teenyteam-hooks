# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

一個很小的 Claude Code hook,把你的 subagent 在做什麼(誰開始了、誰還在工作、誰完成了、工作階段何時在等你核准)以純 JSON 行的形式記錄在你自己的電腦上。

它是 [Tinyfloor](https://tinyfloor-landing.vercel.app/) 的開源部分。Tinyfloor 是一個常駐在螢幕角落的小面板(開發中,尚未發布)。記錄器和事件格式本身就很有用:對檔案 `tail -f`、餵給你自己的儀表板,或做出更好的東西。

> 狀態:原型。已在 **macOS** 上以 Claude Code 2.1.289 驗證。Windows 尚未驗證。`Notification` 的欄位尚未確認。

## 它做什麼

- 監聽 `PreToolUse` / `PostToolUse`(matcher 為 `Agent`)、`SubagentStop` 和 `Notification`。
- 每個事件向 `~/.tinyfloor/events.jsonl` 附加一行,並把每個 subagent 的最後一則訊息存到 `~/.tinyfloor/reports/*.md`。
- 用 `agent_id` 而不是順序來配對開始和結束,因為 hook 的順序不固定,subagent 也可能平行或在背景執行。
- 忽略未知欄位,並且**一律以 exit 0 結束**,所以絕不會阻擋 Claude Code。
- 無相依套件,不連網。任何內容都不會離開你的電腦。

## 安裝

需要 Node.js(Claude Code 使用者通常已經裝了)。把 `hooks/log.js` 複製到你的專案,然後把下面的內容加到 `.claude/settings.local.json`(或 `settings.json`):

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

執行一個 subagent,然後執行 `tail -f ~/.tinyfloor/events.jsonl`。

用 `hooks/fixtures/` 裡的真實 hook 輸入做自我檢查:

```sh
node hooks/log.js --test   # prints "ok"
```

## 事件格式(`events.jsonl`,每行一個 JSON 物件)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | 來源 | 意義 |
|---|---|---|
| `start` | `PreToolUse` (Agent) | subagent 被呼叫。`id` = `tool_use_id`,`agent` = `subagent_type`(預設 `general-purpose`),`task` = `description` |
| `done` | `PostToolUse`,`tool_response.status = "completed"` | 在前景執行,而且已經完成 |
| `launched` | `PostToolUse`,`status = "async_launched"` | 在背景啟動。把 `id` 和 `agent_id` 關聯起來 |
| `stop` | `SubagentStop` | subagent 已完成。`report` 指向儲存下來的最後一則訊息 |
| `waiting` | `Notification` | 工作階段在等你(欄位尚未確認) |

共通欄位:`v`(格式版本)、`t`(ISO 時間)、`project`(`cwd`)、`session`、`cc`(來自未公開文件的環境變數 `AI_AGENT` 的 Claude Code 版本,否則為 `null`)。

現在誰在工作 = `hooks/log.js` 裡的 `reduce(events)`。來自真實輸入的說明:

- hook 順序不固定:`SubagentStop` 可能比 `PostToolUse` 先到。
- 即使沒有 `run_in_background`,subagent 也可能轉到背景;請檢查 `tool_response.status`。
- `SubagentStart` 提供 `agent_id` 但沒有 `tool_use_id`,所以不使用它。

## 給 subagent 的徵才啟事範本

`templates/job-posting.md` 是 `.claude/agents/*.md` 的範本:工作是什麼、做好是什麼樣子、用哪些工具,以及 agent 哪些事可以自己做、哪些必須先問。職責寫得清楚的 subagent 更容易信任,也更容易觀察。

## 授權

MIT。Tinyfloor 是獨立專案,與 Anthropic 無關。
