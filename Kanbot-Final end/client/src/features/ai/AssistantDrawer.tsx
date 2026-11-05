import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { sprintsApi, todosApi } from '../../api/todos';
import { ApiError } from '../../api/client';
import type { ChatMessage, DraftTodo, PlanSprintResponse } from '../../types/api';

const errText = (e: unknown) => (e instanceof ApiError ? (e.code === 'RATE_LIMITED' ? 'Too many AI requests. Please wait a moment.' : e.message) : 'Something went wrong.');
type Tab = 'chat' | 'generate' | 'plan';

function ChatPanel({ projectId }: { projectId: string }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const m = useMutation({
    mutationFn: (all: ChatMessage[]) => aiApi.chat(projectId, { messages: all }),
    onSuccess: (r, all) => setMsgs([...all, r.message]),
  });
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs, m.isPending]);
  const send = () => {
    if (!text.trim() || m.isPending) return;
    const next: ChatMessage[] = [...msgs, { role: 'user', content: text.trim() }];
    setMsgs(next); setText(''); m.mutate(next);
  };
  return (
    <div className="chat">
      <div className="msgs" aria-live="polite">
        {msgs.length === 0 && <p className="muted">Ask anything about your project, e.g. "How should I split a login feature into tasks?"</p>}
        {msgs.map((x, i) => <div key={i} className={`bubble ${x.role}`}>{x.role === 'assistant' ? <Markdown>{x.content}</Markdown> : x.content}</div>)}
        {m.isPending && <div className="bubble assistant muted" role="status">Thinking…</div>}
        {m.isError && <div className="banner error" role="alert">{errText(m.error)} <button className="btn" onClick={() => m.mutate(msgs)}>Retry</button></div>}
        <div ref={end} />
      </div>
      <div className="row">
        <textarea rows={2} placeholder="Message Kanbot…" aria-label="Message" value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <div className="col">
          <button className="btn primary" disabled={!text.trim() || m.isPending} onClick={send}>Send</button>
          <button className="btn" disabled={msgs.length === 0} onClick={() => { setMsgs([]); m.reset(); }}>Clear</button>
        </div>
      </div>
    </div>
  );
}

type Draft = DraftTodo & { on: boolean };

function GeneratePanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState('5');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [added, setAdded] = useState<number | null>(null);
  const gen = useMutation({ mutationFn: () => aiApi.generate(projectId, { prompt: prompt.trim(), count: Number(count) }), onSuccess: (r) => { setAdded(null); setDrafts(r.todos.map((t) => ({ ...t, on: true }))); } });
  const picked = drafts.filter((d) => d.on && d.title.trim());
  const add = useMutation({
    mutationFn: () => todosApi.bulk(projectId, { todos: picked.map(({ on: _on, ...t }) => ({ ...t, title: t.title.trim() })) }),
    onSuccess: (r) => { setAdded(r.todos.length); setDrafts([]); void qc.invalidateQueries({ queryKey: ['todos', projectId] }); void qc.invalidateQueries({ queryKey: ['project', projectId] }); },
  });
  const upd = (i: number, p: Partial<Draft>) => setDrafts((d) => d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div>
      <label className="field"><span>What should the todos be about?</span><textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. user profile page with avatar upload" /></label>
      <div className="row"><label className="field"><span>Count</span><select value={count} onChange={(e) => setCount(e.target.value)}>{[3, 5, 8, 10].map((n) => <option key={n}>{n}</option>)}</select></label>
        <button className="btn primary" disabled={!prompt.trim() || gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? 'Generating…' : 'Generate'}</button></div>
      {(gen.isError || add.isError) && <div className="banner error" role="alert">{errText(gen.error ?? add.error)}</div>}
      {added !== null && <div className="banner" role="status">Added {added} todos to the backlog.</div>}
      {drafts.map((d, i) => (
        <div key={i} className="draft">
          <input type="checkbox" aria-label="Include" checked={d.on} onChange={(e) => upd(i, { on: e.target.checked })} />
          <div className="grow"><input value={d.title} aria-label="Title" onChange={(e) => upd(i, { title: e.target.value })} /><small className="muted">{d.type} · {d.priority} · {d.storyPoints ?? '-'} pts</small></div>
        </div>
      ))}
      {drafts.length > 0 && <button className="btn primary" disabled={picked.length === 0 || add.isPending} onClick={() => add.mutate()}>{add.isPending ? 'Adding…' : `Add ${picked.length} to backlog`}</button>}
    </div>
  );
}

function PlanPanel({ projectId }: { projectId: string }) {
  const qc = useQueryClient();
  const [capacity, setCapacity] = useState('20');
  const [focus, setFocus] = useState('');
  const [plan, setPlan] = useState<PlanSprintResponse | null>(null);
  const [done, setDone] = useState(false);
  const backlog = useQuery({ queryKey: ['todos', projectId, 'backlog', 'plan'], queryFn: () => todosApi.list(projectId, { sprintId: 'backlog' }) });
  const cap = Number(capacity);
  const run = useMutation({ mutationFn: () => aiApi.plan(projectId, { capacity: cap, focus: focus.trim() || undefined }), onSuccess: (r) => { setDone(false); setPlan(r); } });
  const create = useMutation({
    mutationFn: async () => {
      const { sprint } = await sprintsApi.create(projectId, { goal: plan!.goal });
      await Promise.all(plan!.todoIds.map((id) => todosApi.update(id, { sprintId: sprint.id })));
    },
    onSuccess: () => { setDone(true); void qc.invalidateQueries({ queryKey: ['todos', projectId] }); void qc.invalidateQueries({ queryKey: ['sprints', projectId] }); },
  });
  const title = (id: string) => backlog.data?.todos.find((t) => t.id === id);
  return (
    <div>
      <div className="two">
        <label className="field"><span>Capacity (story points)</span><input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />{!(cap > 0) && <small className="err" role="alert">Enter a number above 0</small>}</label>
        <label className="field"><span>Focus (optional)</span><input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. authentication" /></label>
      </div>
      <button className="btn primary" disabled={!(cap > 0) || run.isPending} onClick={() => run.mutate()}>{run.isPending ? 'Planning…' : 'Suggest sprint plan'}</button>
      {(run.isError || create.isError) && <div className="banner error" role="alert">{errText(run.error ?? create.error)}</div>}
      {done && <div className="banner" role="status">Sprint created. Find it in the backlog.</div>}
      {plan && !done && (
        <div className="card plan">
          <strong>Goal: {plan.goal}</strong>
          <ul>{plan.todoIds.map((id) => <li key={id}>{title(id) ? `${title(id)!.key} ${title(id)!.title}` : id}</li>)}</ul>
          <p>{plan.totalPoints} pts</p>
          <div className="muted"><Markdown>{plan.reasoning}</Markdown></div>
          <button className="btn primary" disabled={create.isPending || plan.todoIds.length === 0} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create sprint with these todos'}</button>
        </div>
      )}
    </div>
  );
}

export function AssistantDrawer({ projectId, open, onClose }: { projectId: string; open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('chat');
  const status = useQuery({ queryKey: ['ai-status'], queryFn: aiApi.status, enabled: open });
  const tabs: [Tab, string][] = [['chat', 'Chat'], ['generate', 'Generate todos'], ['plan', 'Plan sprint']];
  return (
    <aside className={`drawer${open ? ' open' : ''}`} aria-label="AI assistant" aria-hidden={!open} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="row between"><h2>AI assistant {status.data && <span className="badge">{status.data.mode === 'mock' ? 'Mock mode' : status.data.model}</span>}</h2>
        <button className="icon" aria-label="Close assistant" onClick={onClose}><X size={18} /></button></div>
      <div role="tablist" className="tabs">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>{l}</button>)}</div>
      <div className="dbody">
        {tab === 'chat' && <ChatPanel projectId={projectId} />}
        {tab === 'generate' && <GeneratePanel projectId={projectId} />}
        {tab === 'plan' && <PlanPanel projectId={projectId} />}
      </div>
    </aside>
  );
}
