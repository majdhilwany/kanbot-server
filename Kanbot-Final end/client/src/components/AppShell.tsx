import { useEffect, useState, type CSSProperties } from 'react';
import { NavLink, Outlet, useLocation, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, LayoutList, KanbanSquare, History, FolderKanban, LogOut } from 'lucide-react';
import { useAuth } from '../features/auth/AuthProvider';
import { projectsApi } from '../api';
import { ThemeToggle } from './ThemeToggle';
import { SettingsMenu } from './SettingsMenu';
import { usePrefs } from '../lib/prefs';
import { AssistantDrawer } from '../features/ai/AssistantDrawer';

const stag = (i: number) => ({ '--i': i }) as CSSProperties;

export function AppShell() {
  const { user, logout } = useAuth();
  const { projectId } = useParams();
  const { t } = usePrefs();
  const { pathname } = useLocation();
  const [aiOpen, setAiOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId!), enabled: !!projectId });
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav active' : 'nav');

  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [menu]);

  return (
    <div className="shell">
      <a className="skip" href="#main">{t('Skip to content')}</a>
      <aside id="sidebar" className={`sidebar${menu ? ' open' : ''}`} aria-label="Main">
        <div className="brand"><img src="/kanbot-icon.svg" alt="" width={30} height={30} /><span>Kanbot</span></div>
        {projectId && (
          <>
            <p className="label">{t('Project')}</p>
            <p className="proj" style={stag(1)}>{project.data ? `${project.data.project.key} · ${project.data.project.name}` : '…'}</p>
            <NavLink style={stag(2)} className={link} to={`/projects/${projectId}/backlog`}><LayoutList size={18} /> {t('Backlog')}</NavLink>
            <NavLink style={stag(3)} className={link} to={`/projects/${projectId}/board`}><KanbanSquare size={18} /> {t('Active Sprint')}</NavLink>
            <NavLink style={stag(4)} className={link} to={`/projects/${projectId}/sprints`}><History size={18} /> {t('Sprints')}</NavLink>
            <hr />
          </>
        )}
        <NavLink style={stag(5)} className={link} to="/projects" end><FolderKanban size={18} /> {t('Projects')}</NavLink>
        <div className="user">
          <div><strong>{user?.name}</strong><small className="muted">{user?.email}</small></div>
          <button className="btn" onClick={logout} aria-label={t('Log out')} title={t('Log out')}><LogOut size={16} /></button>
        </div>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} aria-hidden="true" />}
      <div className="main">
        <header className="topbar">
          <button className={`hamb${menu ? ' open' : ''}`} aria-label={t(menu ? 'Close menu' : 'Menu')} aria-expanded={menu} aria-controls="sidebar" onClick={() => setMenu((m) => !m)}>
            <span /><span /><span />
          </button>
          <div className="row grow-end">
            <ThemeToggle />
            {projectId && <button className="btn primary" onClick={() => setAiOpen(true)}><Sparkles size={16} /> <span className="hide-sm">{t('Ask AI')}</span></button>}
          </div>
        </header>
        <main id="main" tabIndex={-1} key={pathname} className="content"><Outlet /></main>
        {projectId && <AssistantDrawer projectId={projectId} open={aiOpen} onClose={() => setAiOpen(false)} />}
        {!aiOpen && <SettingsMenu />}
      </div>
    </div>
  );
}
