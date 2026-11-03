import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Task } from '@taskboard/shared';
import App from './App';

const task: Task = {
  id: 'task-1',
  title: 'Ship the onboarding flow',
  description: 'Review the final copy with the team.',
  status: 'IN_PROGRESS' as const,
  priority: 'HIGH' as const,
  createdAt: '2026-11-03T09:00:00.000Z',
  updatedAt: '2026-11-03T09:00:00.000Z',
};

function mockApi(initialTasks: Task[] = [task]) {
  let tasks = [...initialTasks];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.endsWith('/api/tasks/stats')) {
      return Response.json({ data: {
        total: tasks.length,
        todo: tasks.filter((item) => item.status === 'TODO').length,
        inProgress: tasks.filter((item) => item.status === 'IN_PROGRESS').length,
        done: tasks.filter((item) => item.status === 'DONE').length,
      } });
    }
    if (url.endsWith('/api/tasks') && method === 'GET') return Response.json({ data: tasks });
    if (url.endsWith('/api/tasks') && method === 'POST') {
      const inputTask = JSON.parse(String(init?.body));
      const created = { ...inputTask, id: 'task-new', createdAt: task.createdAt, updatedAt: task.updatedAt };
      tasks = [...tasks, created];
      return Response.json({ data: created }, { status: 201 });
    }
    if (url.includes('/api/tasks/') && method === 'DELETE') {
      tasks = tasks.filter((item) => !url.endsWith(item.id));
      return Response.json({ data: { id: 'task-1' } });
    }
    if (url.includes('/api/tasks/') && method === 'PATCH') {
      const id = url.split('/').at(-1);
      const changes = JSON.parse(String(init?.body));
      tasks = tasks.map((item) => item.id === id ? { ...item, ...changes } : item);
      return Response.json({ data: tasks.find((item) => item.id === id) });
    }
    return Response.json({ error: { message: 'Not found' } }, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
}

describe('AI Task Board', () => {
  beforeEach(() => mockApi());
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows the three workflow columns and live summary counts', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: 'In progress' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'To do' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();
    expect(await screen.findByText('Ship the onboarding flow')).toBeInTheDocument();
    expect(screen.getAllByText('1', { selector: '.stat-value' })).toHaveLength(2);
  });

  it('creates a task with an accessible form and puts it in the selected column', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Ship the onboarding flow');
    await user.click(screen.getByRole('button', { name: 'Add task to To do' }));
    const dialog = screen.getByRole('dialog', { name: /new task/i });
    await user.type(within(dialog).getByLabelText(/title/i), 'Prepare release notes');
    await user.selectOptions(within(dialog).getByLabelText(/status/i), 'TODO');
    await user.click(within(dialog).getByRole('button', { name: /create task/i }));
    expect(await screen.findByText('Prepare release notes')).toBeInTheDocument();
    expect(within(screen.getByTestId('column-TODO')).getByText('Prepare release notes')).toBeInTheDocument();
  });

  it('filters tasks by title and priority', async () => {
    const user = userEvent.setup();
    mockApi([
      task,
      { ...task, id: 'task-2', title: 'Plan team lunch', status: 'TODO', priority: 'LOW' },
    ]);
    renderApp();
    await screen.findByText('Ship the onboarding flow');
    await user.type(screen.getByRole('searchbox', { name: /search tasks/i }), 'team lunch');
    expect(screen.getByText('Plan team lunch')).toBeInTheDocument();
    expect(screen.queryByText('Ship the onboarding flow')).not.toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: /search tasks/i });
    await user.clear(search);
    await user.type(search, 'final copy');
    expect(screen.getByText('Ship the onboarding flow')).toBeInTheDocument();
    await user.clear(search);
    await user.selectOptions(screen.getByLabelText(/priority/i), 'HIGH');
    expect(screen.getByText('Ship the onboarding flow')).toBeInTheDocument();
    expect(screen.queryByText('Plan team lunch')).not.toBeInTheDocument();
  });

  it('edits an existing task and saves the changed title', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Ship the onboarding flow');
    await user.click(screen.getByRole('button', { name: 'Edit Ship the onboarding flow' }));
    const dialog = screen.getByRole('dialog', { name: /edit task/i });
    const title = within(dialog).getByLabelText(/title/i);
    await user.clear(title);
    await user.type(title, 'Ship onboarding v2');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Ship onboarding v2')).toBeInTheDocument();
  });

  it('moves a task through its accessible status menu and refreshes statistics', async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Ship the onboarding flow');
    await user.selectOptions(screen.getByRole('combobox', { name: /change status for ship the onboarding flow/i }), 'DONE');
    expect(await within(screen.getByTestId('column-DONE')).findByText('Ship the onboarding flow')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('0', { selector: '.stat-value' })).toHaveLength(2));
  });

  it('confirms destructive deletion before sending the request', async () => {
    const fetchMock = mockApi();
    const user = userEvent.setup();
    renderApp();
    await screen.findByText('Ship the onboarding flow');
    await user.click(screen.getByRole('button', { name: /delete ship the onboarding flow/i }));
    const dialog = screen.getByRole('dialog', { name: /delete task/i });
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/api/tasks/task-1'), expect.objectContaining({ method: 'DELETE' }));
    await user.click(within(dialog).getByRole('button', { name: /delete task/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/tasks/task-1'), expect.objectContaining({ method: 'DELETE' })));
  });
});
