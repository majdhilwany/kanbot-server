import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sprintsApi } from '../../api/todos';
import { TODO_STATUSES } from '../../types/api';

const labels: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
};

export function SprintDetailsPage() {
  const { projectId, sprintId } = useParams();
  const q = useQuery({
    queryKey: ['sprint-board', sprintId],
    queryFn: () => sprintsApi.board(sprintId!),
    enabled: Boolean(sprintId),
  });

  if (q.isPending) return <p role="status">Loading sprint details…</p>;
  if (q.isError) return <div className="banner error" role="alert">{q.error.message} <button className="btn" onClick={() => void q.refetch()}>Try again</button></div>;

  const { sprint, columns } = q.data;
  const dateRange = sprint.startDate && sprint.endDate
    ? `${format(new Date(sprint.startDate), 'MMM d, yyyy')} – ${format(new Date(sprint.endDate), 'MMM d, yyyy')}`
    : 'Dates not set';

  return (
    <section className="stack">
      <div className="row between wrap">
        <div>
          <Link to={`/projects/${projectId}/sprints`} className="muted">← All sprints</Link>
          <h1>{sprint.name}</h1>
          <p className="muted">{dateRange} · <span className="badge">{sprint.status}</span></p>
        </div>
        <div className="pts">{sprint.stats.donePoints}/{sprint.stats.totalPoints} pts</div>
      </div>
      {sprint.goal && <div className="panel"><strong>Sprint goal</strong><p>{sprint.goal}</p></div>}
      <div className="grid stats-grid">
        <div className="panel"><span className="muted">Tasks</span><h2>{sprint.stats.totalTodos}</h2></div>
        <div className="panel"><span className="muted">Completed</span><h2>{sprint.stats.doneTodos}</h2></div>
        <div className="panel"><span className="muted">Story points</span><h2>{sprint.stats.donePoints}/{sprint.stats.totalPoints}</h2></div>
      </div>
      <h2>Sprint tasks</h2>
      <div className="board-columns">
        {TODO_STATUSES.map((status) => (
          <section className="board-column" key={status}>
            <h3>{labels[status]} <span className="badge">{columns[status].length}</span></h3>
            {columns[status].length === 0 && <p className="muted">No tasks</p>}
            {columns[status].map((todo) => (
              <article className="todo-card" key={todo.id}>
                <span className="muted">{todo.key}</span>
                <strong>{todo.title}</strong>
                {todo.description && <p className="muted">{todo.description}</p>}
                <div className="row wrap"><span className="badge">{todo.priority}</span>{todo.storyPoints != null && <span className="badge">{todo.storyPoints} pts</span>}</div>
              </article>
            ))}
          </section>
        ))}
      </div>
    </section>
  );
}
