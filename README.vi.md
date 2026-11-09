# TeenyTeam hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Một hook Claude Code nhỏ xíu ghi lại các subagent của bạn đang làm gì (ai đã bắt đầu, ai còn đang làm, ai đã xong, và khi nào một phiên đang chờ bạn phê duyệt) dưới dạng các dòng JSON thuần trên máy của bạn.

Đây là phần mã nguồn mở của [TeenyTeam](https://landing.teenyteam.com/), một bảng nhỏ luôn hiển thị ở góc màn hình (đang phát triển, chưa ra mắt). Trình ghi và định dạng sự kiện tự thân đã hữu ích: chạy `tail -f` trên tệp, đưa vào dashboard của riêng bạn, hoặc tự làm thứ gì đó tốt hơn.

> Trạng thái: bản thử nghiệm. Đã kiểm tra trên **macOS** với Claude Code 2.1.289. Windows chưa được kiểm tra. Các trường của `Notification` chưa được xác nhận.

## Nó làm gì

- Lắng nghe `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` và `Notification`.
- Thêm một dòng cho mỗi sự kiện vào `~/.teenyteam/events.jsonl` và lưu tin nhắn cuối của từng subagent vào `~/.teenyteam/reports/*.md`.
- Ghép lúc bắt đầu và lúc kết thúc bằng `agent_id`, không theo thứ tự: thứ tự hook thay đổi và các subagent chạy song song hoặc chạy nền.
- Bỏ qua các trường không biết và **luôn thoát với exit 0**, nên không bao giờ chặn được Claude Code.
- Không phụ thuộc, không dùng mạng. Không có gì rời khỏi máy của bạn.

## Cài đặt

Cần Node.js (người dùng Claude Code thường đã có). Sao chép `hooks/log.js` vào dự án, rồi thêm đoạn này vào `.claude/settings.local.json` (hoặc `settings.json`):

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

Chạy một subagent, rồi chạy `tail -f ~/.teenyteam/events.jsonl`.

Tự kiểm tra bằng dữ liệu đầu vào hook thật trong `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Định dạng sự kiện (`events.jsonl`, mỗi dòng một đối tượng JSON)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Từ | Ý nghĩa |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Subagent được gọi. `id` = `tool_use_id`, `agent` = `subagent_type` (mặc định `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Chạy ở tiền cảnh và đã xong |
| `launched` | `PostToolUse`, `status = "async_launched"` | Bắt đầu chạy nền. Nối `id` với `agent_id` |
| `stop` | `SubagentStop` | Subagent đã xong. `report` trỏ tới tin nhắn cuối đã lưu |
| `waiting` | `Notification` | Phiên đang chờ bạn (các trường chưa được xác nhận) |

Các trường chung: `v` (phiên bản định dạng), `t` (giờ ISO), `project` (`cwd`), `session`, `cc` (phiên bản Claude Code lấy từ biến môi trường `AI_AGENT` không có tài liệu, nếu không thì `null`).

Ai đang làm việc lúc này = `reduce(events)` trong `hooks/log.js`. Ghi chú từ dữ liệu đầu vào thật:

- Thứ tự hook thay đổi: `SubagentStop` có thể đến trước `PostToolUse`.
- Một subagent có thể chuyển sang chạy nền ngay cả khi không có `run_in_background`; hãy kiểm tra `tool_response.status`.
- `SubagentStart` cho `agent_id` nhưng không có `tool_use_id`, nên không được dùng.

## Mẫu tin tuyển dụng cho subagent

`templates/job-posting.md` là mẫu cho `.claude/agents/*.md`: công việc là gì, làm tốt trông như thế nào, dùng công cụ nào, và agent được tự làm gì so với phải hỏi trước. Subagent có bản mô tả công việc rõ ràng thì dễ tin tưởng hơn và dễ theo dõi hơn.

## Giấy phép

MIT. TeenyTeam là một dự án độc lập, không liên kết với Anthropic.
