# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

サブエージェントが何をしているか(誰が開始したか、誰がまだ作業中か、誰が終わったか、セッションがいつ承認待ちになったか)を、手元のマシンにプレーンな JSON 行として記録する小さな Claude Code の hook です。

画面の隅に常駐する小さなパネル [Tinyfloor](https://tinyfloor-landing.vercel.app/) のオープンな部分です(開発中で、まだ公開していません)。ロガーとイベント形式は単体でも役に立ちます。ファイルを `tail -f` で眺めたり、自作のダッシュボードに渡したり、もっと良いものを作ったりできます。

> ステータス: プロトタイプ。**macOS** で Claude Code 2.1.289 を使って確認しました。Windows は未確認です。`Notification` のフィールドも未確認です。

## できること

- `PreToolUse` / `PostToolUse`(matcher は `Agent`)、`SubagentStop`、`Notification` を受け取ります。
- イベントごとに 1 行を `~/.tinyfloor/events.jsonl` に追記し、各サブエージェントの最後のメッセージを `~/.tinyfloor/reports/*.md` に保存します。
- 開始と終了は順番ではなく `agent_id` で対応づけます。hook の順序は一定ではなく、サブエージェントは並列やバックグラウンドで動くためです。
- 未知のフィールドは無視し、**常に exit 0 で終了**するので、Claude Code を止めることはありません。
- 依存なし、ネットワークなし。データがマシンの外に出ることはありません。

## インストール

Node.js が必要です(Claude Code を使っている人はたいてい入っています)。`hooks/log.js` をプロジェクトにコピーし、次の内容を `.claude/settings.local.json`(または `settings.json`)に追加します。

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

サブエージェントを 1 回動かしてから、`tail -f ~/.tinyfloor/events.jsonl` を実行してください。

`hooks/fixtures/` にある実際の hook 入力でセルフチェックできます。

```sh
node hooks/log.js --test   # prints "ok"
```

## イベント形式(`events.jsonl`、1 行に 1 つの JSON オブジェクト)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | 発生元 | 意味 |
|---|---|---|
| `start` | `PreToolUse` (Agent) | サブエージェントが呼ばれた。`id` = `tool_use_id`、`agent` = `subagent_type`(既定値は `general-purpose`)、`task` = `description` |
| `done` | `PostToolUse`、`tool_response.status = "completed"` | フォアグラウンドで実行され、すでに終了した |
| `launched` | `PostToolUse`、`status = "async_launched"` | バックグラウンドで開始した。`id` と `agent_id` を結びつける |
| `stop` | `SubagentStop` | サブエージェントが終了した。`report` は保存された最後のメッセージを指す |
| `waiting` | `Notification` | セッションがあなたを待っている(フィールドは未確認) |

共通フィールド: `v`(形式のバージョン)、`t`(ISO 形式の時刻)、`project`(`cwd`)、`session`、`cc`(ドキュメントにない環境変数 `AI_AGENT` から取った Claude Code のバージョン。なければ `null`)。

今誰が作業中かは、`hooks/log.js` の `reduce(events)` で求まります。実際の入力から分かったこと:

- hook の順序は一定ではありません。`SubagentStop` が `PostToolUse` より先に届くことがあります。
- `run_in_background` がなくても、サブエージェントがバックグラウンドに移ることがあります。`tool_response.status` を確認してください。
- `SubagentStart` は `agent_id` を返しますが `tool_use_id` を返さないため、使っていません。

## サブエージェント用の求人票テンプレート

`templates/job-posting.md` は `.claude/agents/*.md` 用のテンプレートです。仕事の内容、「うまくできた」状態とは何か、使うツール、エージェントが単独でやってよいことと先に確認すべきことを書きます。職務内容がはっきりしているサブエージェントは、信頼しやすく、見守りやすくなります。

## ライセンス

MIT。Tinyfloor は独立したプロジェクトであり、Anthropic とは関係ありません。
