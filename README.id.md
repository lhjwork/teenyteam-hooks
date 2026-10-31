# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Hook Claude Code mungil yang mencatat apa yang dikerjakan subagen kamu (siapa yang mulai, siapa yang masih bekerja, siapa yang selesai, dan kapan sesi menunggu persetujuanmu) sebagai baris JSON biasa di komputermu.

Ini bagian terbuka dari [Tinyfloor](https://tinyfloor-landing.vercel.app/), panel kecil yang selalu tampil di sudut layar (sedang dikembangkan, belum dirilis). Pencatat dan format event-nya berguna sendiri: jalankan `tail -f` pada filenya, kirim ke dasbor buatanmu, atau bikin yang lebih bagus.

> Status: prototipe. Dicek di **macOS** dengan Claude Code 2.1.289. Windows belum dicek. Field `Notification` belum dikonfirmasi.

## Apa yang dilakukannya

- Mendengarkan `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop`, dan `Notification`.
- Menambahkan satu baris per event ke `~/.tinyfloor/events.jsonl` dan menyimpan pesan akhir tiap subagen ke `~/.tinyfloor/reports/*.md`.
- Memasangkan mulai dan selesai lewat `agent_id`, bukan urutan, karena urutan hook bisa berubah dan subagen berjalan paralel atau di latar belakang.
- Mengabaikan field yang tidak dikenal dan **selalu keluar dengan exit 0**, jadi tidak pernah bisa menghalangi Claude Code.
- Tanpa dependensi, tanpa jaringan. Tidak ada yang keluar dari komputermu.

## Pemasangan

Butuh Node.js (pengguna Claude Code biasanya sudah punya). Salin `hooks/log.js` ke proyekmu, lalu tambahkan ini ke `.claude/settings.local.json` (atau `settings.json`):

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

Jalankan satu subagen, lalu `tail -f ~/.tinyfloor/events.jsonl`.

Pengecekan mandiri dengan input hook asli di `hooks/fixtures/`:

```sh
node hooks/log.js --test   # prints "ok"
```

## Format event (`events.jsonl`, satu objek JSON per baris)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Dari | Arti |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Subagen dipanggil. `id` = `tool_use_id`, `agent` = `subagent_type` (default `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Berjalan di latar depan dan sudah selesai |
| `launched` | `PostToolUse`, `status = "async_launched"` | Dimulai di latar belakang. Menghubungkan `id` dengan `agent_id` |
| `stop` | `SubagentStop` | Subagen selesai. `report` menunjuk ke pesan akhir yang tersimpan |
| `waiting` | `Notification` | Sesi menunggumu (field belum dikonfirmasi) |

Field umum: `v` (versi format), `t` (waktu ISO), `project` (`cwd`), `session`, `cc` (versi Claude Code dari variabel lingkungan `AI_AGENT` yang tidak terdokumentasi, kalau tidak ada `null`).

Siapa yang sedang bekerja = `reduce(events)` di `hooks/log.js`. Catatan dari input asli:

- Urutan hook bisa berubah: `SubagentStop` bisa datang sebelum `PostToolUse`.
- Subagen bisa pindah ke latar belakang meski tanpa `run_in_background`; periksa `tool_response.status`.
- `SubagentStart` memberi `agent_id` tetapi tidak ada `tool_use_id`, jadi tidak dipakai.

## Templat lowongan kerja untuk subagen

`templates/job-posting.md` adalah templat untuk `.claude/agents/*.md`: apa pekerjaannya, seperti apa hasil yang bagus, alat apa yang dipakai, dan apa yang boleh dikerjakan agen sendiri dibanding yang harus ditanyakan dulu. Subagen dengan deskripsi pekerjaan yang jelas lebih mudah dipercaya dan lebih mudah diawasi.

## Lisensi

MIT. Tinyfloor adalah proyek independen, tidak berafiliasi dengan Anthropic.
