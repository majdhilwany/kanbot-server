import type { TodoPriority, TodoStatus, TodoType } from '../types/api';

export const STATUS_LABEL: Record<TodoStatus, string> = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
export const PRIORITY_LABEL: Record<TodoPriority, string> = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
export const TYPE_LABEL: Record<TodoType, string> = { task: 'Task', story: 'Story', bug: 'Bug' };

