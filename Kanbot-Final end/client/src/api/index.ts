import { request } from './client';
import type {
  AuthResponse, CreateProjectRequest, LoginRequest, MeResponse, Project, ProjectWithStats, RegisterRequest,
} from '../types/api';

export const authApi = {
  register: (b: RegisterRequest) => request<AuthResponse>('POST', '/auth/register', b),
  login: (b: LoginRequest) => request<AuthResponse>('POST', '/auth/login', b),
  me: () => request<MeResponse>('GET', '/auth/me'),
};

export const projectsApi = {
  list: () => request<{ projects: ProjectWithStats[] }>('GET', '/projects'),
  get: (id: string) => request<{ project: ProjectWithStats }>('GET', `/projects/${id}`),
  create: (b: CreateProjectRequest) => request<{ project: Project }>('POST', '/projects', b),
  remove: (id: string) => request<void>('DELETE', `/projects/${id}`),
};
