import type { CreateTaskInput, Task, TaskStats, UpdateTaskInput } from '@taskboard/shared';

const baseUrl = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload
      && typeof payload.error === 'object' && payload.error !== null && 'message' in payload.error
      && typeof payload.error.message === 'string'
      ? payload.error.message
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    throw new Error('The server returned an unexpected response.');
  }
  return payload.data as T;
}

export const taskApi = {
  list: () => request<Task[]>('/api/tasks'),
  stats: () => request<TaskStats>('/api/tasks/stats'),
  create: (input: CreateTaskInput) => request<Task>('/api/tasks', {
    method: 'POST', body: JSON.stringify(input),
  }),
  update: (id: string, input: UpdateTaskInput) => request<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(input),
  }),
  remove: (id: string) => request<{ id: string }>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
};
