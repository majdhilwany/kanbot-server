import { createBrowserRouter, Navigate, useParams } from 'react-router';
import { AuthRoot, GuestRoute, ProtectedRoute } from './features/auth/AuthProvider';
import { LoginPage, RegisterPage } from './features/auth/AuthPages';
import { AppShell } from './components/AppShell';
import { NotFound } from './components/Misc';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { BacklogPage } from './features/backlog/BacklogPage';
import { BoardPage } from './features/board/BoardPage';
import { SprintsPage } from './features/sprints/SprintsPage';
import { SprintDetailsPage } from './features/sprints/SprintDetailsPage';

function ToBacklog() {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${projectId}/backlog`} replace />;
}

export const router = createBrowserRouter([
  {
    element: <AuthRoot />,
    children: [
      { element: <GuestRoute />, children: [{ path: '/login', element: <LoginPage /> }, { path: '/register', element: <RegisterPage /> }] },
      {
        element: <ProtectedRoute />,
        children: [{
          element: <AppShell />,
          children: [
            { path: '/', element: <Navigate to="/projects" replace /> },
            { path: '/projects', element: <ProjectsPage /> },
            { path: '/projects/:projectId', element: <ToBacklog /> },
            { path: '/projects/:projectId/backlog', element: <BacklogPage /> },
            { path: '/projects/:projectId/board', element: <BoardPage /> },
            { path: '/projects/:projectId/sprints', element: <SprintsPage /> },
            { path: '/projects/:projectId/sprints/:sprintId', element: <SprintDetailsPage /> },
          ],
        }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
