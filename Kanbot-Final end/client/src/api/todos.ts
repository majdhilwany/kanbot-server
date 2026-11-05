import { request } from './client';
import type { BulkCreateTodosRequest, BulkCreateTodosResponse, CompleteSprintRequest, SprintBoardResponse, StartSprintRequest, CreateSprintRequest, CreateTodoRequest, MoveTodoRequest, Sprint, SprintListResponse, Todo, TodoListQuery, UpdateTodoRequest } from '../types/api';

export const todosApi = {
  list: (projectId: string, q: TodoListQuery) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
    return request<{ todos: Todo[] }>('GET', `/projects/${projectId}/todos?${p.toString()}`);
  },
  create: (projectId: string, b: CreateTodoRequest) => request<{ todo: Todo }>('POST', `/projects/${projectId}/todos`, b),
  bulk: (projectId: string, b: BulkCreateTodosRequest) => request<BulkCreateTodosResponse>('POST', `/projects/${projectId}/todos/bulk`, b),
  update: (id: string, b: UpdateTodoRequest) => request<{ todo: Todo }>('PATCH', `/todos/${id}`, b),
  move: (id: string, b: MoveTodoRequest) => request<{ todo: Todo }>('POST', `/todos/${id}/move`, b),
  remove: (id: string) => request<void>('DELETE', `/todos/${id}`),
};

export const sprintsApi = {
  list: (projectId: string) => request<SprintListResponse>('GET', `/projects/${projectId}/sprints`),
  create: (projectId: string, b: CreateSprintRequest) => request<{ sprint: Sprint }>('POST', `/projects/${projectId}/sprints`, b),
  board: (id: string) => request<SprintBoardResponse>('GET', `/sprints/${id}/todos`),
  start: (id: string, b: StartSprintRequest) => request<{ sprint: Sprint }>('POST', `/sprints/${id}/start`, b),
  complete: (id: string, b: CompleteSprintRequest) => request<{ sprint: Sprint }>('POST', `/sprints/${id}/complete`, b),
};
