import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { sprintsApi } from '../../api/todos';
import { ApiError } from '../../api/client';
import type { Sprint } from '../../types/api';

export function CompleteSprintDialog({ sprint, onClose }: { sprint: Sprint; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dest, setDest] = useState('backlog');
  const list = useQuery({ queryKey: ['sprints', sprint.projectId], queryFn: () => sprintsApi.list(sprint.projectId) });
  const planned = (list.data?.sprints ?? []).filter((s) => s.status === 'planned');
  const { doneTodos, totalTodos } = sprint.stats;
  const m = useMutation({
    mutationFn: () => sprintsApi.complete(sprint.id, { moveUnfinishedTo: dest }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sprints', sprint.projectId] }); void qc.invalidateQueries({ queryKey: ['todos', sprint.projectId] }); void qc.invalidateQueries({ queryKey: ['project', sprint.projectId] });
      navigate(`/projects/${sprint.projectId}/sprints`);
    },
  });
  return (
    <Modal title={`Complete ${sprint.name}`} onClose={onClose}>
      {m.isError && <div className="banner error" role="alert">{m.error instanceof ApiError ? m.error.message : 'Something went wrong.'}</div>}
      <p>{doneTodos} done · {totalTodos - doneTodos} not done</p>
      <label className="field"><span>Move unfinished todos to</span>
        <select value={dest} onChange={(e) => setDest(e.target.value)}><option value="backlog">Backlog</option>{planned.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </label>
      <div className="row end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={m.isPending} onClick={() => m.mutate()}>{m.isPending ? 'Completing…' : 'Complete sprint'}</button></div>
    </Modal>
  );
}
