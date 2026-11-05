import { request } from './client';
import type { AiStatusResponse, ChatRequest, ChatResponse, GenerateTodosRequest, GenerateTodosResponse, PlanSprintRequest, PlanSprintResponse, SprintSummaryResponse } from '../types/api';

export const aiApi = {
  status: () => request<AiStatusResponse>('GET', '/ai/status'),
  chat: (projectId: string, b: ChatRequest) => request<ChatResponse>('POST', `/projects/${projectId}/ai/chat`, b),
  generate: (projectId: string, b: GenerateTodosRequest) => request<GenerateTodosResponse>('POST', `/projects/${projectId}/ai/generate-todos`, b),
  plan: (projectId: string, b: PlanSprintRequest) => request<PlanSprintResponse>('POST', `/projects/${projectId}/ai/plan-sprint`, b),
  summary: (sprintId: string) => request<SprintSummaryResponse>('POST', `/sprints/${sprintId}/ai/summary`),
};
