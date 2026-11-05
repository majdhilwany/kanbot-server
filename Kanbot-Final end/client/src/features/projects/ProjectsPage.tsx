import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { projectsApi } from '../../api';
import { ApiError, fieldErrors } from '../../api/client';
import { usePrefs } from '../../lib/prefs';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  key: z.string().trim().regex(/^([A-Za-z]{2,6})?$/, 'Key must be 2–6 letters'),
  description: z.string().max(500),
});
type Values = z.infer<typeof schema>;

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const { t } = usePrefs();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ref = useRef<HTMLDialogElement>(null);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema), defaultValues: { name: '', key: '', description: '' },
  });
  useEffect(() => { ref.current?.showModal(); }, []);

  const create = useMutation({
    mutationFn: (v: Values) => projectsApi.create({ name: v.name, key: v.key ? v.key.toUpperCase() : undefined, description: v.description || undefined }),
    onSuccess: ({ project }) => { void qc.invalidateQueries({ queryKey: ['projects'] }); navigate(`/projects/${project.id}/backlog`); },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 409) { setError('key', { message: 'This key is already used' }); return; }
      const fe = fieldErrors(e);
      (['name', 'key', 'description'] as const).forEach((k) => { if (fe[k]) setError(k, { message: fe[k] }); });
    },
  });

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="np-title">
      <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate>
        <h2 id="np-title">{t('New project')}</h2>
        <label className="field"><span>{t('Name')}</span><input {...register('name')} />{errors.name && <small className="err" role="alert">{t(errors.name.message ?? '')}</small>}</label>
        <label className="field"><span>{t('Key (optional)')}</span><input maxLength={6} {...register('key')} />{errors.key && <small className="err" role="alert">{t(errors.key.message ?? '')}</small>}</label>
        <label className="field"><span>{t('Description (optional)')}</span><textarea rows={3} {...register('description')} /></label>
        <div className="row end">
          <button type="button" className="btn" onClick={() => ref.current?.close()}>{t('Cancel')}</button>
          <button className="btn primary" disabled={create.isPending}>{t(create.isPending ? 'Creating…' : 'Create project')}</button>
        </div>
      </form>
    </dialog>
  );
}

export function ProjectsPage() {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });

  return (
    <>
      <div className="row between">
        <h1>{t('Projects')}</h1>
        <button className="btn primary" onClick={() => setOpen(true)}><Plus size={16} /> {t('New project')}</button>
      </div>
      {q.isPending && <p role="status">{t('Loading projects…')}</p>}
      {q.isError && (
        <div className="banner error" role="alert">
          {q.error.message} <button className="btn" onClick={() => void q.refetch()}>{t('Try again')}</button>
        </div>
      )}
      {q.data && q.data.projects.length === 0 && (
        <div className="empty"><p>{t('You have no projects yet.')}</p><button className="btn primary" onClick={() => setOpen(true)}>{t('Create your first project')}</button></div>
      )}
      <div className="grid">
        {q.data?.projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}/backlog`} className="card project">
            <span className="key">{p.key}</span>
            <h3>{p.name}</h3>
            <p className="muted">{p.description || t('No description')}</p>
            <small>{t('{n} in backlog', { n: p.stats.backlogCount })} · {p.stats.activeSprint ? t('Active: {name}', { name: p.stats.activeSprint.name }) : t('No active sprint')}</small>
          </Link>
        ))}
      </div>
      {open && <CreateProjectDialog onClose={() => setOpen(false)} />}
    </>
  );
}
