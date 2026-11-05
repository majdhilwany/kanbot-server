import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sprintsApi, todosApi } from '../../api/todos';
import { ApiError, fieldErrors } from '../../api/client';
import { PRIORITY_LABEL, STATUS_LABEL, TYPE_LABEL } from '../../lib/constants';
import { STORY_POINTS, TODO_PRIORITIES, TODO_STATUSES, TODO_TYPES } from '../../types/api';
import type { StoryPoints, Todo, TodoPriority, TodoStatus, TodoType } from '../../types/api';

interface Form {
  title: string; description: string; type: TodoType; status: TodoStatus; priority: TodoPriority;
  points: string; labels: string; dueDate: string; sprintId: string;
}
const toForm = (t: Todo): Form => ({
  title: t.title, description: t.description, type: t.type, status: t.status, priority: t.priority,
  points: t.storyPoints === null ? '' : String(t.storyPoints), labels: t.labels.join(', '),
  dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '', sprintId: t.sprintId ?? '',
});

export function TodoDetailsDialog({ todo, onClose }: { todo: Todo; onClose: () => void }) {
  const qc = useQueryClient();
  const ref = useRef<HTMLDialogElement>(null);
  const initial = useRef(toForm(todo));
  const [f, setF] = useState<Form>(initial.current);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const sprints = useQuery({ queryKey: ['sprints', todo.projectId], queryFn: () => sprintsApi.list(todo.projectId) });
  const dirty = JSON.stringify(f) !== JSON.stringify(initial.current);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => { ref.current?.showModal(); }, []);
  const requestClose = () => { if (dirty && !window.confirm('Discard changes?')) return; onClose(); };
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['todos', todo.projectId] }); void qc.invalidateQueries({ queryKey: ['board'] }); void qc.invalidateQueries({ queryKey: ['sprints', todo.projectId] }); void qc.invalidateQueries({ queryKey: ['project', todo.projectId] }); };
  const fail = (e: unknown) => { setErrs(fieldErrors(e)); setMsg(e instanceof ApiError ? e.message : 'Something went wrong.'); };

  const save = useMutation({
    mutationFn: () => todosApi.update(todo.id, {
      title: f.title.trim(), description: f.description, type: f.type, status: f.status, priority: f.priority,
      storyPoints: f.points ? (Number(f.points) as StoryPoints) : null,
      labels: f.labels.split(',').map((l) => l.trim()).filter(Boolean),
      dueDate: f.dueDate || null, sprintId: f.sprintId || null,
    }),
    onSuccess: () => { refresh(); onClose(); },
    onError: fail,
  });
  const del = useMutation({ mutationFn: () => todosApi.remove(todo.id), onSuccess: () => { refresh(); onClose(); }, onError: fail });

  const E = ({ k }: { k: string }) => (errs[k] ? <small className="err" role="alert">{errs[k]}</small> : null);
  const openSprints = (sprints.data?.sprints ?? []).filter((s) => s.status !== 'completed');

  return (
    <dialog ref={ref} className="dialog wide" aria-labelledby="td-title" onCancel={(e) => { e.preventDefault(); requestClose(); }}>
      <form onSubmit={(e) => { e.preventDefault(); if (!f.title.trim()) { setErrs({ title: 'Title is required' }); return; } setErrs({}); save.mutate(); }} noValidate>
        <h2 id="td-title">{todo.key}</h2>
        {msg && <div className="banner error" role="alert">{msg}</div>}
        <label className="field"><span>Title</span><input value={f.title} onChange={(e) => set('title', e.target.value)} /><E k="title" /></label>
        <label className="field"><span>Description</span><textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} /><E k="description" /></label>
        <div className="two">
          <label className="field"><span>Type</span><select value={f.type} onChange={(e) => set('type', e.target.value as TodoType)}>{TODO_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></label>
          <label className="field"><span>Status</span><select value={f.status} onChange={(e) => set('status', e.target.value as TodoStatus)}>{TODO_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
          <label className="field"><span>Priority</span><select value={f.priority} onChange={(e) => set('priority', e.target.value as TodoPriority)}>{TODO_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></label>
          <label className="field"><span>Story points</span><select value={f.points} onChange={(e) => set('points', e.target.value)}><option value="">None</option>{STORY_POINTS.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <label className="field"><span>Due date</span><input type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} /><E k="dueDate" /></label>
          <label className="field"><span>Sprint</span><select value={f.sprintId} onChange={(e) => set('sprintId', e.target.value)}><option value="">Backlog</option>{openSprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}</select></label>
        </div>
        <label className="field"><span>Labels (comma separated)</span><input value={f.labels} onChange={(e) => set('labels', e.target.value)} /><E k="labels" /></label>
        <div className="row between">
          {confirmDel ? (
            <span className="row"><span>Delete {todo.key}?</span><button type="button" className="btn danger" disabled={del.isPending} onClick={() => del.mutate()}>Yes, delete</button><button type="button" className="btn" onClick={() => setConfirmDel(false)}>No</button></span>
          ) : <button type="button" className="btn danger" onClick={() => setConfirmDel(true)}>Delete</button>}
          <span className="row">
            <button type="button" className="btn" onClick={requestClose}>Close</button>
            <button className="btn primary" disabled={!dirty || save.isPending}>{save.isPending ? 'Saving…' : 'Save'}</button>
          </span>
        </div>
      </form>
    </dialog>
  );
}
