import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { Modal } from '../../components/Modal';
import { sprintsApi } from '../../api/todos';
import { ApiError } from '../../api/client';
import type { Sprint } from '../../types/api';

export function StartSprintDialog({ sprint, onClose }: { sprint: Sprint; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [start, setStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [end, setEnd] = useState(format(addDays(new Date(), 14), 'yyyy-MM-dd'));
  const m = useMutation({
    mutationFn: () => sprintsApi.start(sprint.id, { startDate: start, endDate: end }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['sprints', sprint.projectId] }); void qc.invalidateQueries({ queryKey: ['project', sprint.projectId] }); navigate(`/projects/${sprint.projectId}/board`); },
  });
  const bad = end < start;
  return (
    <Modal title={`Start ${sprint.name}`} onClose={onClose}>
      {m.isError && <div className="banner error" role="alert">{m.error instanceof ApiError ? m.error.message : 'Something went wrong.'}</div>}
      <div className="two">
        <label className="field"><span>Start date</span><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="field"><span>End date</span><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />{bad && <small className="err" role="alert">End must be after start</small>}</label>
      </div>
      <div className="row end"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={bad || m.isPending} onClick={() => m.mutate()}>{m.isPending ? 'Starting…' : 'Start sprint'}</button></div>
    </Modal>
  );
}
