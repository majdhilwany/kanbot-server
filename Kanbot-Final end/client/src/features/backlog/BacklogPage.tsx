import { useRef, useState } from 'react';
import { useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronsDown, ChevronsUp, GripVertical, Plus } from 'lucide-react';
import { sprintsApi, todosApi } from '../../api/todos';
import { ApiError } from '../../api/client';
import { useDebounced } from '../../lib/useDebounced';
import { PRIORITY_LABEL, TYPE_LABEL } from '../../lib/constants';
import { TODO_PRIORITIES, TODO_TYPES } from '../../types/api';
import type { Sprint, Todo, TodoPriority, TodoType } from '../../types/api';
import { Points, PriorityBadge, TypeBadge } from '../todos/TodoBits';
import { TodoDetailsDialog } from '../todos/TodoDetailsDialog';
import { StartSprintDialog } from '../sprints/StartSprintDialog';

interface RowProps { todo: Todo; canDrag: boolean; onOpen: () => void; onMove: (pos: number) => void; last: number }

function Row({ todo, canDrag, onOpen, onMove, last }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id, disabled: !canDrag });
  return (
    <li ref={setNodeRef} className={`trow${isDragging ? ' dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <button className="icon" aria-label={`Drag ${todo.key}`} disabled={!canDrag} {...attributes} {...listeners}><GripVertical size={16} /></button>
      <span className="tkey">{todo.key}</span>
      <button className="ttitle" onClick={onOpen}>{todo.title}</button>
      {todo.labels.map((l) => <span key={l} className="badge">{l}</span>)}
      <TypeBadge t={todo.type} /><PriorityBadge p={todo.priority} /><Points n={todo.storyPoints} />
      <button className="icon" aria-label="Move to top" title="Move to top" disabled={!canDrag} onClick={() => onMove(0)}><ChevronsUp size={16} /></button>
      <button className="icon" aria-label="Move to bottom" title="Move to bottom" disabled={!canDrag} onClick={() => onMove(last)}><ChevronsDown size={16} /></button>
    </li>
  );
}

export function BacklogPage() {
  const projectId = useParams().projectId!;
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<TodoPriority | ''>('');
  const [type, setType] = useState<TodoType | ''>('');
  const [title, setTitle] = useState('');
  const [open, setOpen] = useState<Todo | null>(null);
  const [starting, setStarting] = useState<Sprint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = useDebounced(search.trim(), 300);
  const filtered = !!(q || priority || type);
  const key = ['todos', projectId, 'backlog', { q, priority, type }];

  const list = useQuery({ queryKey: key, queryFn: () => todosApi.list(projectId, { sprintId: 'backlog', search: q || undefined, priority: priority || undefined, type: type || undefined }) });
  const sprints = useQuery({ queryKey: ['sprints', projectId], queryFn: () => sprintsApi.list(projectId) });
  const todos = list.data?.todos ?? [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const errMsg = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['todos', projectId] }); void qc.invalidateQueries({ queryKey: ['project', projectId] }); };

  const create = useMutation({
    mutationFn: (t: string) => todosApi.create(projectId, { title: t }),
    onSuccess: () => { setTitle(''); setError(null); setSuccess('Task created successfully'); window.setTimeout(() => setSuccess(null), 2800); refresh(); inputRef.current?.focus(); },
    onError: (e) => setError(errMsg(e)),
  });
  const createSprint = useMutation({
    mutationFn: () => sprintsApi.create(projectId, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['sprints', projectId] }),
    onError: (e) => setError(errMsg(e)),
  });
  const move = useMutation({
    mutationFn: ({ id, position }: { id: string; from: number; position: number }) => todosApi.move(id, { position }),
    onMutate: async ({ from, position }) => {
      await qc.cancelQueries({ queryKey: ['todos', projectId] });
      const prev = qc.getQueryData<{ todos: Todo[] }>(key);
      if (prev) qc.setQueryData(key, { todos: arrayMove(prev.todos, from, position) });
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); setError(`Could not reorder: ${errMsg(e)}`); },
    onSettled: refresh,
  });
  const doMove = (from: number, position: number) => { if (from !== position) move.mutate({ id: todos[from].id, from, position }); };
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    doMove(todos.findIndex((t) => t.id === e.active.id), todos.findIndex((t) => t.id === e.over!.id));
  };

  const planned = (sprints.data?.sprints ?? []).filter((s) => s.status !== 'completed');
  const hasActive = (sprints.data?.sprints ?? []).some((s) => s.status === 'active');
  const totalPts = todos.reduce((n, t) => n + (t.storyPoints ?? 0), 0);

  return (
    <>
      <div className="row between"><h1>Backlog</h1><button className="btn" disabled={createSprint.isPending} onClick={() => createSprint.mutate()}><Plus size={16} /> Create sprint</button></div>
      {error && <div className="banner error" role="alert">{error} <button className="btn" onClick={() => setError(null)}>Dismiss</button></div>}
      {success && <div className="success-toast" role="status"><span className="success-check">✓</span><span><strong>Task added</strong><small>{success}</small></span></div>}

      {planned.length > 0 && (
        <section className="sprints" aria-label="Sprints">
          {planned.map((s) => (
            <div key={s.id} className="card sprint"><strong>{s.name}</strong> <span className="badge">{s.status}</span><small className="muted">{s.stats.totalTodos} todos · {s.stats.totalPoints} pts</small>{s.status === 'planned' && <button className="btn" disabled={hasActive} title={hasActive ? 'Another sprint is already active' : undefined} onClick={() => setStarting(s)}>Start sprint</button>}</div>
          ))}
        </section>
      )}

      <div className="filters">
        <input type="search" placeholder="Search key, title, labels…" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as TodoPriority | '')}><option value="">All priorities</option>{TODO_PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select>
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value as TodoType | '')}><option value="">All types</option>{TODO_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select>
      </div>
      {filtered && <p className="muted">Reordering is disabled while a filter is active. Use the Move to top/bottom buttons after clearing filters.</p>}
      <p className="muted" role="status">{todos.length} todos · {totalPts} pts</p>

      {list.isPending && <p role="status">Loading backlog…</p>}
      {list.isError && <div className="banner error" role="alert">{errMsg(list.error)} <button className="btn" onClick={() => void list.refetch()}>Try again</button></div>}
      {list.data && todos.length === 0 && !filtered && <div className="empty"><p>Your backlog is empty</p><p className="muted">Create a todo below to get started.</p></div>}
      {list.data && todos.length === 0 && filtered && <p className="muted">No todos match your filters.</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="tlist">
            {todos.map((t, i) => <Row key={t.id} todo={t} canDrag={!filtered} last={todos.length - 1} onOpen={() => setOpen(t)} onMove={(p) => doMove(i, p)} />)}
          </ul>
        </SortableContext>
      </DndContext>

      <form className="quick" onSubmit={(e) => { e.preventDefault(); if (title.trim() && !create.isPending) create.mutate(title.trim()); }}>
        <Plus size={16} />
        <input ref={inputRef} placeholder="Create todo — type a title and press Enter" aria-label="New todo title" value={title}
          onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setTitle(''); }} />
      </form>

      {starting && <StartSprintDialog sprint={starting} onClose={() => setStarting(null)} />}
      {open && <TodoDetailsDialog key={open.id} todo={open} onClose={() => setOpen(null)} />}
    </>
  );
}
