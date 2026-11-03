import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  ArrowUpRight, Check, ChevronDown, ClipboardList,
  Clock3, Command, Filter, ListFilter, LoaderCircle,
  Pencil, Plus, Search, Sparkles, Trash2, X,
} from 'lucide-react';
import {
  createTaskSchema, TASK_PRIORITIES, TASK_STATUSES,
  type CreateTaskInput, type Task, type TaskPriority, type TaskStatus, type TaskStats,
} from '@taskboard/shared';
import { taskApi } from './services/api';
import './styles.css';

const columnLabels: Record<TaskStatus, string> = {
  TODO: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done',
};
const priorityLabels: Record<TaskPriority, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High',
};
const statusOrder = TASK_STATUSES;
const emptyStats: TaskStats = { total: 0, todo: 0, inProgress: 0, done: 0 };

type DialogState = { kind: 'edit'; task: Task } | { kind: 'create'; status: TaskStatus } | { kind: 'delete'; task: Task } | null;
type TaskFormOutput = Omit<CreateTaskInput, 'status' | 'priority'> & { status: TaskStatus; priority: TaskPriority };

function App() {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [toast, setToast] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const tasksQuery = useQuery({ queryKey: ['tasks'], queryFn: taskApi.list });
  const statsQuery = useQuery({ queryKey: ['task-stats'], queryFn: taskApi.stats });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['task-stats'] }),
    ]);
  };
  const createMutation = useMutation({ mutationFn: taskApi.create, onSuccess: async () => { await refresh(); setDialog(null); showToast('Task created'); } });
  const updateMutation = useMutation({ mutationFn: ({ id, changes }: { id: string; changes: Partial<CreateTaskInput> }) => taskApi.update(id, changes), onSuccess: async () => { await refresh(); setDialog(null); showToast('Changes saved'); } });
  const deleteMutation = useMutation({ mutationFn: taskApi.remove, onSuccess: async () => { await refresh(); setDialog(null); showToast('Task deleted'); } });
  const moveMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => taskApi.update(id, { status }), onSuccess: async () => { await refresh(); showToast('Task moved'); } });

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast((current) => current === message ? '' : current), 2800);
  }

  const tasks = tasksQuery.data ?? [];
  const stats = statsQuery.data ?? emptyStats;
  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !normalized || `${task.title} ${task.description ?? ''}`.toLocaleLowerCase().includes(normalized);
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, query, statusFilter, priorityFilter]);

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error ?? moveMutation.error;
  const isInitialLoading = tasksQuery.isPending || statsQuery.isPending;
  const loadError = tasksQuery.error ?? statsQuery.error;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#board" aria-label="Taskboard home">
          <span className="brand-mark"><Command size={16} strokeWidth={2.7} /></span>
          <span>taskboard<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-right">
          <span className="workspace-label"><span className="online-dot" /> Personal workspace</span>
          <div className="avatar" aria-label="Your profile">M</div>
        </div>
      </header>

      <section className="page-content" id="board">
        <div className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> YOUR WORKSPACE</div>
            <h1>Make room for <span>meaningful work.</span></h1>
            <p className="page-subtitle">A clear view of what’s moving, what’s next, and what’s done.</p>
          </div>
          <button className="primary-button" onClick={() => { createMutation.reset(); setDialog({ kind: 'create', status: 'TODO' }); }} type="button">
            <Plus size={17} strokeWidth={2.5} /> New task
          </button>
        </div>

        <section className="focus-strip" aria-label="Today at a glance">
          <div className="focus-intro">
            <span className="focus-icon"><Sparkles size={17} /></span>
            <div><span className="focus-label">TODAY AT A GLANCE</span><span className="focus-date">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}</span></div>
          </div>
          <div className="focus-progress" aria-label={`${stats.done} of ${stats.total} tasks complete`}>
            <div className="focus-progress-copy"><strong>{stats.done} <span>of {stats.total}</span></strong><span>tasks complete</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ transform: `scaleX(${stats.total ? Math.min(1, stats.done / stats.total) : 0})` }} /></div>
          </div>
          <div className="focus-complete"><Check size={16} /> Keep your momentum</div>
        </section>

        <section className="stats-grid" aria-label="Task overview">
          <StatCard label="Total tasks" value={stats.total} icon={<ClipboardList size={17} />} tone="blue" />
          <StatCard label="To do" value={stats.todo} icon={<ListFilter size={17} />} tone="slate" />
          <StatCard label="In progress" value={stats.inProgress} icon={<Clock3 size={17} />} tone="amber" />
          <StatCard label="Completed" value={stats.done} icon={<Check size={17} />} tone="green" />
        </section>

        <div className="board-toolbar">
          <div className="board-title-wrap"><h2>Project board</h2><span className="task-count">{visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}</span></div>
          <div className="board-controls">
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <input ref={searchRef} aria-label="Search tasks" type="search" placeholder="Search tasks..." value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X size={14} /></button>}
              {!query && <kbd>⌘ K</kbd>}
            </label>
            <label className="filter-select"><Filter size={15} aria-hidden="true" /><span className="sr-only">Filter by status</span>
              <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="ALL">All statuses</option>{statusOrder.map((status) => <option key={status} value={status}>{columnLabels[status]}</option>)}
              </select><ChevronDown size={14} aria-hidden="true" />
            </label>
            <label className="filter-select priority-filter"><span className="sr-only">Filter by priority</span>
              <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                <option value="ALL">All priorities</option>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
              </select><ChevronDown size={14} aria-hidden="true" />
            </label>
          </div>
        </div>

        {mutationError && <div className="inline-alert" role="alert"><span>{mutationError.message || 'The task could not be saved.'}</span><button type="button" aria-label="Dismiss error" onClick={() => { createMutation.reset(); updateMutation.reset(); deleteMutation.reset(); moveMutation.reset(); }}><X size={15} /></button></div>}
        {loadError && <div className="load-error" role="alert"><strong>We couldn’t load your board.</strong><span>{loadError.message}</span><button type="button" className="secondary-button" onClick={() => { void tasksQuery.refetch(); void statsQuery.refetch(); }}>Try again</button></div>}

        {isInitialLoading ? <div className="loading-state" role="status"><LoaderCircle className="spin" size={21} /> Loading your board…</div> : !loadError && (
          <section className="kanban" aria-label="Kanban board">
            {statusOrder.map((status) => {
              const columnTasks = visibleTasks.filter((task) => task.status === status);
              return <section className={`kanban-column column-${status.toLowerCase()}`} key={status} data-testid={`column-${status}`} aria-labelledby={`heading-${status}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData('text/task-id');
                const task = tasks.find((item) => item.id === id);
                if (task && task.status !== status) moveMutation.mutate({ id, status });
              }}>
                <header className="column-header">
                  <div className="column-heading"><span className="status-marker" /><h3 id={`heading-${status}`}>{columnLabels[status]}</h3><span className="column-count">{columnTasks.length}</span></div>
                  <button className="icon-button column-add" aria-label={`Add task to ${columnLabels[status]}`} type="button" onClick={() => { createMutation.reset(); setDialog({ kind: 'create', status }); }}><Plus size={16} /></button>
                </header>
                <div className="column-body">
                  {columnTasks.map((task) => <TaskCard key={task.id} task={task} onEdit={() => { updateMutation.reset(); setDialog({ kind: 'edit', task }); }} onDelete={() => { deleteMutation.reset(); setDialog({ kind: 'delete', task }); }} onMove={(nextStatus) => moveMutation.mutate({ id: task.id, status: nextStatus })} />)}
                  {columnTasks.length === 0 && <div className="column-empty">{tasks.length === 0 ? 'A clear space to begin.' : 'No tasks here yet.'}</div>}
                </div>
              </section>;
            })}
          </section>
        )}
        {!isInitialLoading && !loadError && tasks.length > 0 && visibleTasks.length === 0 && <div className="no-results"><Search size={17} /><span>No tasks match these filters.</span><button type="button" onClick={() => { setQuery(''); setStatusFilter('ALL'); setPriorityFilter('ALL'); }}>Clear filters</button></div>}
        {!isInitialLoading && !loadError && tasks.length === 0 && <div className="empty-hint"><ArrowUpRight size={15} /> Your next step starts with a task. Add one above to get moving.</div>}
      </section>

      <footer className="page-footer"><span>Small steps, steady progress.</span><span>Built for focus <span className="footer-dot">·</span> One task at a time</span></footer>
      {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
      {dialog?.kind === 'create' && <TaskDialog key={`create-${dialog.status}`} title="New task" submitLabel="Create task" initialStatus={dialog.status} onClose={() => setDialog(null)} onSubmit={(values) => createMutation.mutate(values)} isSaving={createMutation.isPending} error={createMutation.error?.message} />}
      {dialog?.kind === 'edit' && <TaskDialog key={dialog.task.id} title="Edit task" submitLabel="Save changes" task={dialog.task} onClose={() => setDialog(null)} onSubmit={(values) => updateMutation.mutate({ id: dialog.task.id, changes: values })} isSaving={updateMutation.isPending} error={updateMutation.error?.message} />}
      {dialog?.kind === 'delete' && <ConfirmDialog task={dialog.task} onCancel={() => setDialog(null)} onConfirm={() => deleteMutation.mutate(dialog.task.id)} isDeleting={deleteMutation.isPending} />}
    </main>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: string }) {
  return <div className="stat-card"><span className={`stat-icon tone-${tone}`}>{icon}</span><div className="stat-copy"><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong></div><span className="stat-trend"><ArrowUpRight size={14} /></span></div>;
}

function TaskCard({ task, onEdit, onDelete, onMove }: { task: Task; onEdit: () => void; onDelete: () => void; onMove: (status: TaskStatus) => void }) {
  return <article className="task-card" draggable onDragStart={(event) => event.dataTransfer.setData('text/task-id', task.id)}>
    <div className="task-card-top"><span className={`priority priority-${task.priority.toLowerCase()}`}><span className="priority-dot" />{priorityLabels[task.priority]} priority</span></div>
    <h4>{task.title}</h4>
    {task.description && <p className="task-description">{task.description}</p>}
    <div className="task-card-bottom"><span className="task-updated">Updated {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(task.updatedAt))}</span><div className="card-actions">
      <label className="status-change"><span className="sr-only">Change status for {task.title}</span><select aria-label={`Change status for ${task.title}`} value={task.status} onChange={(event) => onMove(event.target.value as TaskStatus)}>{statusOrder.map((status) => <option key={status} value={status}>{columnLabels[status]}</option>)}</select><ChevronDown size={12} /></label>
      <button className="icon-button" type="button" aria-label={`Edit ${task.title}`} onClick={onEdit}><Pencil size={14} /></button>
      <button className="icon-button delete-action" type="button" aria-label={`Delete ${task.title}`} onClick={onDelete}><Trash2 size={14} /></button>
    </div></div>
  </article>;
}

function TaskDialog({ title, submitLabel, task, initialStatus = 'TODO', onClose, onSubmit, isSaving, error }: {
  title: string; submitLabel: string; task?: Task; initialStatus?: TaskStatus; onClose: () => void;
  onSubmit: (values: CreateTaskInput) => void; isSaving: boolean; error?: string | undefined;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTaskInput, unknown, TaskFormOutput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: task ? { title: task.title, description: task.description ?? '', priority: task.priority, status: task.status } : { title: '', description: '', priority: 'MEDIUM', status: initialStatus },
  });
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) onClose(); }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title" onKeyDown={(event) => { if (event.key === 'Escape' && !isSaving) onClose(); }}>
      <div className="dialog-header"><div><span className="dialog-kicker">TASK DETAILS</span><h2 id="task-dialog-title">{title}</h2></div><button className="icon-button close-dialog" type="button" aria-label="Close dialog" onClick={onClose} disabled={isSaving}><X size={18} /></button></div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="form-field"><span>Title <span className="required-mark">*</span></span><input autoFocus placeholder="Give your task a clear name" maxLength={120} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'title-error' : undefined} {...register('title')} />{errors.title && <small className="field-error" id="title-error">{errors.title.message}</small>}</label>
        <label className="form-field"><span>Description <span className="optional-label">Optional</span></span><textarea placeholder="Add details to help you get started" maxLength={2000} rows={4} {...register('description')} /></label>
        <div className="form-row"><label className="form-field"><span>Priority</span><select {...register('priority')}>{TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}</select></label><label className="form-field"><span>Status</span><select {...register('status')}>{statusOrder.map((status) => <option key={status} value={status}>{columnLabels[status]}</option>)}</select></label></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onClose} disabled={isSaving}>Cancel</button><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? <><LoaderCircle className="spin" size={16} /> Saving…</> : submitLabel}</button></div>
      </form>
    </section>
  </div>;
}

function ConfirmDialog({ task, onCancel, onConfirm, isDeleting }: { task: Task; onCancel: () => void; onConfirm: () => void; isDeleting: boolean }) {
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) onCancel(); }}>
    <section className="dialog confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title" onKeyDown={(event) => { if (event.key === 'Escape' && !isDeleting) onCancel(); }}>
      <div className="confirm-icon"><Trash2 size={19} /></div><button className="icon-button close-dialog" type="button" aria-label="Close dialog" onClick={onCancel} disabled={isDeleting}><X size={18} /></button>
      <h2 id="delete-dialog-title">Delete task?</h2><p><strong>{task.title}</strong> will be permanently removed from your board.</p>
      <div className="dialog-actions"><button className="secondary-button" type="button" onClick={onCancel} disabled={isDeleting}>Keep task</button><button className="danger-button" type="button" onClick={onConfirm} disabled={isDeleting}>{isDeleting ? <><LoaderCircle className="spin" size={15} /> Deleting…</> : 'Delete task'}</button></div>
    </section>
  </div>;
}

export default App;
