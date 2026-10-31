#!/usr/bin/env node
// Tinyfloor hook logger (prototype, checked on macOS).
// Input: Claude Code hook JSON on stdin -> one line in ~/.tinyfloor/events.jsonl (+ reports/*.md)
// Always exits 0 so it can never block Claude Code. Unknown fields are ignored.
//
// Observed on Claude Code 2.1.289 (see hooks/fixtures/):
// - Hook order varies (SubagentStop can arrive before PostToolUse).
// - A subagent can run in the background even without run_in_background -> use tool_response.status.
//   "completed" = already finished, "async_launched" = finishes at SubagentStop(agent_id).
// -> Pair start/end by agent_id, not by order (see reduce).
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(os.homedir(), '.tinyfloor');

const ccVersion = () => {
  const m = String(process.env.AI_AGENT || '').match(/claude-code_(\d+)-(\d+)-(\d+)/); // undocumented env var; null if missing
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
};

const textOf = r => Array.isArray(r && r.content) ? r.content.filter(c => c && c.type === 'text').map(c => c.text).join('\n') : '';
const firstLine = s => String(s || '').trim().split('\n')[0].slice(0, 200);

// One hook input -> one event (or null). The report body is passed separately in `report`.
function toEvent(i, now = new Date().toISOString()) {
  const base = { v: 1, t: now, project: i.cwd || null, session: i.session_id || null, cc: ccVersion() };
  const ti = i.tool_input || {};
  const r = i.tool_response || {};
  switch (i.hook_event_name) {
    case 'PreToolUse':
      if (i.tool_name !== 'Agent') return null;
      return { ...base, type: 'start', id: i.tool_use_id, agent: ti.subagent_type || 'general-purpose', task: ti.description || '' };
    case 'PostToolUse': {
      if (i.tool_name !== 'Agent') return null;
      if (r.status === 'completed') {
        const text = textOf(r);
        return { ...base, type: 'done', id: i.tool_use_id, agent_id: r.agentId || null, agent: r.agentType || ti.subagent_type, summary: firstLine(text), report: text };
      }
      return { ...base, type: 'launched', id: i.tool_use_id, agent_id: r.agentId || null, agent: r.agentType || ti.subagent_type };
    }
    case 'SubagentStop':
      return { ...base, type: 'stop', agent_id: i.agent_id || null, agent: i.agent_type || null, summary: firstLine(i.last_assistant_message), report: i.last_assistant_message || '' };
    case 'Notification':
      return { ...base, type: 'waiting', kind: i.notification_type || null, message: i.message || '' };
    default:
      return null;
  }
}

// Events -> subagents currently working.
function reduce(events) {
  const jobs = new Map();     // id(tool_use_id) -> {agent, task, session, agent_id, done}
  const byAgentId = new Map(); // agent_id -> id
  const stopped = new Set();   // stops that arrived before their pair
  const waiting = new Set();   // sessions waiting for approval
  for (const e of events) {
    if (e.type === 'start') jobs.set(e.id, { agent: e.agent, task: e.task, session: e.session, done: false });
    if ((e.type === 'launched' || e.type === 'done') && jobs.has(e.id)) {
      const j = jobs.get(e.id);
      if (e.agent_id) { j.agent_id = e.agent_id; byAgentId.set(e.agent_id, e.id); if (stopped.has(e.agent_id)) j.done = true; }
      if (e.type === 'done') j.done = true;
    }
    if (e.type === 'stop') {
      const id = byAgentId.get(e.agent_id);
      if (id) jobs.get(id).done = true; else stopped.add(e.agent_id);
    }
    if (e.type === 'waiting') waiting.add(e.session);
    if (e.type === 'start' || e.type === 'done' || e.type === 'stop') waiting.delete(e.session); // activity ends waiting
  }
  return [...jobs.values()].filter(j => !j.done).map(j => ({ agent: j.agent, task: j.task, waiting: waiting.has(j.session) }));
}

function write(e) {
  fs.mkdirSync(path.join(DIR, 'reports'), { recursive: true });
  const { report, ...line } = e;
  if (report && e.agent_id) {
    // Both done (PostToolUse) and stop (SubagentStop) arrive, so one file per agent_id.
    const name = `${e.t.slice(0, 10)}-${e.agent || 'agent'}-${e.agent_id}.md`.replace(/[^\w.-]/g, '_');
    fs.writeFileSync(path.join(DIR, 'reports', name), report);
    line.report = `reports/${name}`;
  }
  fs.appendFileSync(path.join(DIR, 'events.jsonl'), JSON.stringify(line) + '\n');
}

module.exports = { toEvent, reduce };

if (require.main === module && process.argv.includes('--test')) {
  const assert = require('assert');
  for (const f of fs.readdirSync(path.join(__dirname, 'fixtures'))) {
    const inputs = require(path.join(__dirname, 'fixtures', f));
    const events = inputs.map(i => toEvent(i)).filter(Boolean);
    assert.ok(events.some(e => e.type === 'start'), f + ': no start');
    assert.strictEqual(reduce(events.slice(0, 1)).length, 1, f + ': one working right after start');
    assert.strictEqual(reduce(events).length, 0, f + ': none working at the end');
    // Still finished when order is flipped (stop before launched)
    const flipped = [events[0], ...events.slice(1).reverse()];
    assert.strictEqual(reduce(flipped).length, 0, f + ': flipped order');
  }
  const w = reduce([{ type: 'start', id: 'a', agent: 'x', session: 's' }, { type: 'waiting', session: 's' }]);
  assert.deepStrictEqual(w, [{ agent: 'x', task: undefined, waiting: true }]);
  console.log('ok'); process.exit(0);
}

if (require.main === module) {
  let raw = '';
  process.stdin.on('data', c => raw += c);
  process.stdin.on('end', () => {
    try { const e = toEvent(JSON.parse(raw)); if (e) write(e); } catch {}
    process.exit(0);
  });
}
