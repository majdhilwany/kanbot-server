import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DndContext, KeyboardSensor, PointerSensor, closestCorners, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { differenceInCalendarDays } from 'date-fns';
import { sprintsApi, todosApi } from '../../api/todos';
import { ApiError } from '../../api/client';
import { STATUS_LABEL } from '../../lib/constants';
import { TODO_STATUSES } from '../../types/api';
import type { SprintBoardResponse, Todo, TodoStatus } from '../../types/api';
import { Points, PriorityBadge, TypeBadge } from '../todos/TodoBits';
import { TodoDetailsDialog } from '../todos/TodoDetailsDialog';
import { CompleteSprintDialog } from './CompleteSprintDialog';
import { SprintSummaryDialog } from '../ai/SprintSummaryDialog';
import { fmtRange } from '../sprints/SprintsPage';

function Card({ todo, onOpen }: { todo: Todo; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });
  return (
    <div ref={setNodeRef} className={`kcard${isDragging ? ' dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
      <small className="muted">{todo.key}</small>
      <button className="ttitle" onClick={onOpen}>{todo.title}</button>
      <div className="row"><TypeBadge t={todo.type} /><PriorityBadge p={todo.priority} /><Points n={todo.storyPoints} /></div>
    </div>
  );
}

function Column({ status, todos, onOpen }: { status: TodoStatus; todos: Todo[]; onOpen: (t: Todo) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  return (
    <section className={`kcol${isOver ? ' over' : ''}`} aria-label={STATUS_LABEL[status]}>
      <h3>{STATUS_LABEL[status]} <span className="badge">{todos.length}</span></h3>
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="kbody">
          {todos.map((t) => <Card key={t.id} todo={t} onOpen={() => onOpen(t)} />)}
          {todos.length === 0 && <p className="muted">No todos</p>}
        </div>
      </SortableContext>
    </section>
  );
}

export function BoardPage() {
  const projectId = useParams().projectId!;
  const qc = useQueryClient();
  const [open, setOpen] = useState<Todo | null>(null);
  const [completing, setCompleting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sprints = useQuery({ queryKey: ['sprints', projectId], queryFn: () => sprintsApi.list(projectId) });
  const sprint = sprints.data?.sprints.find((s) => s.status === 'active');
  const key = ['board', sprint?.id];
  const board = useQuery({ queryKey: key, queryFn: () => sprintsApi.board(sprint!.id), enabled: !!sprint });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['board'] }); void qc.invalidateQueries({ queryKey: ['sprints', projectId] }); };

  const move = useMutation({
    mutationFn: (v: { id: string; status: TodoStatus; position: number; next: SprintBoardResponse['columns'] }) => todosApi.move(v.id, { status: v.status, position: v.position }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<SprintBoardResponse>(key);
      if (prev) qc.setQueryData(key, { ...prev, columns: v.next });
      return { prev };
    },
    onError: (e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); setError(`Could not move todo: ${e instanceof ApiError ? e.message : 'unknown error'}`); },
    onSettled: refresh,
  });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const cols = board.data?.columns;
    if (!cols || !over) return;
    const find = (id: string) => (id.startsWith('col:') ? (id.slice(4) as TodoStatus) : TODO_STATUSES.find((s) => cols[s].some((t) => t.id === id)));
    const from = find(String(active.id)); const to = find(String(over.id));
    if (!from || !to) return;
    const todo = cols[from].find((t) => t.id === active.id)!;
    const isCol = String(over.id).startsWith('col:');
    const without = cols[to].filter((t) => t.id !== todo.id);
    const position = isCol ? without.length : cols[to].findIndex((t) => t.id === over.id);
    if (from === to && position === cols[from].findIndex((t) => t.id === todo.id)) return;
    const target = [...without]; target.splice(position, 0, { ...todo, status: to });
    const next = { ...cols, [to]: target, ...(from !== to ? { [from]: cols[from].filter((t) => t.id !== todo.id) } : {}) };
    move.mutate({ id: todo.id, status: to, position, next });
  };

  if (sprints.isPending) return <p role="status">Loading…</p>;
  if (sprints.isError) return <div className="banner error" role="alert">{sprints.error.message} <button className="btn" onClick={() => void sprints.refetch()}>Try again</button></div>;
  if (!sprint) return <div className="empty"><h1>No active sprint</h1><p className="muted">Start a sprint from the backlog to see its board.</p><Link className="btn primary" to={`/projects/${projectId}/backlog`}>Go to backlog</Link></div>;

  const cols = board.data?.columns;
  const all = cols ? TODO_STATUSES.flatMap((s) => cols[s]) : [];
  const total = all.reduce((n, t) => n + (t.storyPoints ?? 0), 0);
  const done = (cols?.done ?? []).reduce((n, t) => n + (t.storyPoints ?? 0), 0);
  const left = sprint.endDate ? differenceInCalendarDays(new Date(sprint.endDate), new Date()) : null;

  return (
    <>
      <div className="row between">
        <div><h1>{sprint.name} <small className="muted">{fmtRange(sprint.startDate, sprint.endDate)}{left !== null ? ` · ${left >= 0 ? `${left} days left` : `${-left} days overdue`}` : ''}</small></h1>{sprint.goal && <p className="muted">Goal: {sprint.goal}</p>}</div>
        <div className="row"><button className="btn" onClick={() => setSummarizing(true)}>Summarize</button><button className="btn primary" onClick={() => setCompleting(true)}>Complete sprint</button></div>
      </div>
      <div className="row"><progress value={done} max={total || 1} aria-label="Sprint progress" /> <span>{done} / {total} pts done</span></div>
      {error && <div className="banner error" role="alert">{error} <button className="btn" onClick={() => setError(null)}>Dismiss</button></div>}
      {board.isPending && <p role="status">Loading board…</p>}
      {board.isError && <div className="banner error" role="alert">{board.error.message}</div>}
      {cols && (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="kboard">{TODO_STATUSES.map((s) => <Column key={s} status={s} todos={cols[s]} onOpen={setOpen} />)}</div>
        </DndContext>
      )}
      {open && <TodoDetailsDialog key={open.id} todo={open} onClose={() => setOpen(null)} />}
      {summarizing && <SprintSummaryDialog sprint={sprint} onClose={() => setSummarizing(false)} />}
      {completing && <CompleteSprintDialog sprint={sprint} onClose={() => setCompleting(false)} />}
    </>
  );
}
