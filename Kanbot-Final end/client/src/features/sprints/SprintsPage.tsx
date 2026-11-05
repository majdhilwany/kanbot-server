import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sprintsApi } from '../../api/todos';
import { SprintSummaryDialog } from '../ai/SprintSummaryDialog';
import type { Sprint } from '../../types/api';

export const fmtRange = (a: string | null, b: string | null) => (a && b ? `${format(new Date(a), 'MMM d')} – ${format(new Date(b), 'MMM d')}` : 'No dates');

export function SprintsPage() {
  const projectId = useParams().projectId!;
  const [sel, setSel] = useState<Sprint | null>(null);
  const q = useQuery({ queryKey: ['sprints', projectId], queryFn: () => sprintsApi.list(projectId) });
  return (
    <>
      <h1>Sprints</h1>
      {q.isPending && <p role="status">Loading sprints…</p>}
      {q.isError && <div className="banner error" role="alert">{q.error.message} <button className="btn" onClick={() => void q.refetch()}>Try again</button></div>}
      {q.data?.sprints.length === 0 && <div className="empty"><p>No sprints yet.</p><Link className="btn primary" to={`/projects/${projectId}/backlog`}>Go to backlog</Link></div>}
      <div className="tlist">
        {q.data?.sprints.map((s) => {
          const st = s.status === 'completed' && s.completedStats ? s.completedStats : s.stats;
          return (
            <div key={s.id} className="trow">
              <Link to={`/projects/${projectId}/sprints/${s.id}`}><strong>{s.name}</strong></Link><span className="badge">{s.status}</span>
              <span className="muted ttitle">{fmtRange(s.startDate, s.endDate)}{s.goal ? ` · ${s.goal}` : ''}</span>
              <span className="pts">{st.donePoints}/{st.totalPoints} pts</span>{s.status !== 'planned' && <button className="btn" onClick={() => setSel(s)}>Summary</button>}
            </div>
          );
        })}
      </div>
      {sel && <SprintSummaryDialog sprint={sel} onClose={() => setSel(null)} />}
    </>
  );
}
