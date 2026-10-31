# Tinyfloor hooks

[English](README.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Français](README.fr.md) · [Bahasa Indonesia](README.id.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Polski](README.pl.md) · [Português (Brasil)](README.pt-BR.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [简体中文](README.zh-CN.md) · [繁體中文](README.zh-TW.md)

Alt ajanlarının ne yaptığını (kim başladı, kim hâlâ çalışıyor, kim bitirdi ve bir oturum ne zaman onayını bekliyor) bilgisayarında düz JSON satırları olarak kaydeden minik bir Claude Code hook'u.

[Tinyfloor](https://tinyfloor-landing.vercel.app/)'un açık kaynak kısmıdır; Tinyfloor, ekranının köşesinde hep açık duran küçük bir paneldir (geliştirme aşamasında, henüz çıkmadı). Kaydedici ve olay biçimi tek başına da işe yarar: dosyaya `tail -f` çek, kendi panona ver ya da daha iyisini yap.

> Durum: prototip. **macOS**'ta Claude Code 2.1.289 ile denendi. Windows henüz denenmedi. `Notification` alanları henüz doğrulanmadı.

## Ne yapar

- `PreToolUse` / `PostToolUse` (matcher `Agent`), `SubagentStop` ve `Notification` olaylarını dinler.
- Her olay için `~/.tinyfloor/events.jsonl` dosyasına bir satır ekler ve her alt ajanın son mesajını `~/.tinyfloor/reports/*.md` içine kaydeder.
- Başlangıç ile bitişi sıraya göre değil `agent_id` ile eşleştirir: hook sırası değişebilir ve alt ajanlar paralel ya da arka planda çalışır.
- Bilinmeyen alanları yok sayar ve **her zaman exit 0 ile çıkar**, yani Claude Code'u asla engelleyemez.
- Bağımlılık yok, ağ yok. Hiçbir şey bilgisayarından çıkmaz.

## Kurulum

Node.js gerekir (Claude Code kullanıcılarında genelde vardır). `hooks/log.js` dosyasını projene kopyala ve şunu `.claude/settings.local.json` (veya `settings.json`) içine ekle:

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

Bir alt ajan çalıştır, sonra `tail -f ~/.tinyfloor/events.jsonl` komutunu çalıştır.

`hooks/fixtures/` içindeki gerçek hook girdileriyle kendi kendine sınama:

```sh
node hooks/log.js --test   # prints "ok"
```

## Olay biçimi (`events.jsonl`, her satırda bir JSON nesnesi)

```json
{"v":1,"t":"…","project":"/Users/me/app","session":"…","cc":"2.1.289","type":"start","id":"toolu_01…","agent":"code-reviewer","task":"Review the auth PR"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"launched","id":"toolu_01…","agent_id":"a5c8…","agent":"code-reviewer"}
{"v":1,"t":"…","project":"…","session":"…","cc":"2.1.289","type":"stop","agent_id":"a5c8…","agent":"code-reviewer","summary":"2 issues found…","report":"reports/2026-10-31-code-reviewer-a5c8….md"}
```

| `type` | Kaynak | Anlamı |
|---|---|---|
| `start` | `PreToolUse` (Agent) | Alt ajan çağrıldı. `id` = `tool_use_id`, `agent` = `subagent_type` (varsayılan `general-purpose`), `task` = `description` |
| `done` | `PostToolUse`, `tool_response.status = "completed"` | Ön planda çalıştı ve zaten bitti |
| `launched` | `PostToolUse`, `status = "async_launched"` | Arka planda başladı. `id` ile `agent_id`'yi bağlar |
| `stop` | `SubagentStop` | Alt ajan bitirdi. `report`, kaydedilen son mesajı gösterir |
| `waiting` | `Notification` | Oturum seni bekliyor (alanlar henüz doğrulanmadı) |

Ortak alanlar: `v` (biçim sürümü), `t` (ISO zamanı), `project` (`cwd`), `session`, `cc` (belgelenmemiş `AI_AGENT` ortam değişkeninden alınan Claude Code sürümü, yoksa `null`).

Şu an kimin çalıştığı = `hooks/log.js` içindeki `reduce(events)`. Gerçek girdilerden notlar:

- Hook sırası değişir: `SubagentStop`, `PostToolUse`'dan önce gelebilir.
- Bir alt ajan `run_in_background` olmadan da arka plana geçebilir; `tool_response.status` değerine bak.
- `SubagentStart`, `agent_id` verir ama `tool_use_id` vermez, bu yüzden kullanılmaz.

## Alt ajanlar için iş ilanı şablonu

`templates/job-posting.md`, `.claude/agents/*.md` için bir şablondur: işin ne olduğu, iyi yapılmış işin neye benzediği, hangi araçlar ve ajanın neyi tek başına yapabileceği, neyi önce sorması gerektiği. İş tanımı net olan bir alt ajana güvenmek de, onu izlemek de daha kolaydır.

## Lisans

MIT. Tinyfloor bağımsız bir projedir, Anthropic ile bağlantısı yoktur.
