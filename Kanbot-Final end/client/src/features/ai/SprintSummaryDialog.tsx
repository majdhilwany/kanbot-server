import { useState } from 'react';
import Markdown from 'react-markdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/Modal';
import { aiApi } from '../../api/ai';
import { ApiError } from '../../api/client';
import type { Sprint, SprintSummary } from '../../types/api';

export function SprintSummaryDialog({ sprint, onClose }: { sprint: Sprint; onClose: () => void }) {
  const qc = useQueryClient();
  const [res, setRes] = useState<SprintSummary | null>(sprint.summary ?? null);
  const m = useMutation({
    mutationFn: () => aiApi.summary(sprint.id),
    onSuccess: (r) => { setRes(r.summary); void qc.invalidateQueries({ queryKey: ['sprints', sprint.projectId] }); },
  });
  return (
    <Modal title={`${sprint.name} summary`} onClose={onClose}>
      {m.isError && <div className="banner error" role="alert">{m.error instanceof ApiError ? m.error.message : 'Something went wrong.'}</div>}
      {m.isPending && <p role="status">Writing summary…</p>}
      {res && <div className="summary"><Markdown>{res.content}</Markdown><small className="muted">{res.source === 'mock' ? 'Mock summary' : 'AI summary'}</small></div>}
      <div className="row end">
        <button className="btn" onClick={onClose}>Close</button>
        <button className="btn primary" disabled={m.isPending} onClick={() => m.mutate()}>{res ? 'Regenerate' : 'Generate summary'}</button>
      </div>
    </Modal>
  );
}
